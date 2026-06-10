const { Pool } = require('pg');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
const sqlitePath = path.join(__dirname, '..', 'data', 'hopeveri.sqlite');
let pool = null;
let sqliteDb = null;
let usingPostgres = false;

function normalizePlaceholders(text) {
  return text.replace(/\$\d+/g, '?');
}

async function initPostgres() {
  pool = new Pool({ connectionString });
  await pool.query('SELECT 1');
  usingPostgres = true;
  return pool;
}

function initSqlite() {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  sqliteDb = new Database(sqlitePath);
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');
  return sqliteDb;
}

async function runMigrations() {
  if (usingPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        subscription TEXT NOT NULL DEFAULT 'free',
        subscription_end_at TIMESTAMPTZ,
        email_connected BOOLEAN NOT NULL DEFAULT false,
        email_provider TEXT,
        confirmed BOOLEAN NOT NULL DEFAULT false,
        confirmation_token TEXT,
        confirmation_token_expires_at TIMESTAMPTZ,
        active BOOLEAN NOT NULL DEFAULT true,
        daily_quota INTEGER NOT NULL DEFAULT 5,
        quota_reset_at DATE,
        document_preferences TEXT DEFAULT '[]',
        auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
        custom_rules TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text_excerpt TEXT NOT NULL,
        score INTEGER NOT NULL,
        classification TEXT NOT NULL,
        profile TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'detect',
        is_humanized BOOLEAN NOT NULL DEFAULT false,
        humanized_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
    `);
  } else {
    sqliteDb.prepare(`PRAGMA foreign_keys = ON;`).run();
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        subscription TEXT NOT NULL DEFAULT 'free',
        subscription_end_at TEXT,
        email_connected INTEGER NOT NULL DEFAULT 0,
        email_provider TEXT,
        confirmed INTEGER NOT NULL DEFAULT 0,
        confirmation_token TEXT,
        confirmation_token_expires_at TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        daily_quota INTEGER NOT NULL DEFAULT 5,
        quota_reset_at TEXT,
        document_preferences TEXT DEFAULT '[]',
        auto_sync_enabled INTEGER NOT NULL DEFAULT 0,
        custom_rules TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).run();
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        text_excerpt TEXT NOT NULL,
        score INTEGER NOT NULL,
        classification TEXT NOT NULL,
        profile TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'detect',
        is_humanized INTEGER NOT NULL DEFAULT 0,
        humanized_text TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);`).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);`).run();
  }
}

async function initializeDatabase() {
  if (connectionString) {
    try {
      await initPostgres();
      console.log('Connected to PostgreSQL.');
    } catch (error) {
      console.warn('PostgreSQL unavailable, basculant sur SQLite local:', error.message || error);
    }
  }
  if (!usingPostgres) {
    initSqlite();
    console.log('Connected to SQLite local database.');
  }
  await runMigrations();
}

async function query(text, params = []) {
  if (usingPostgres) {
    return pool.query(text, params);
  }
  const normalized = normalizePlaceholders(text);
  const statement = sqliteDb.prepare(normalized);
  if (/^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(text)) {
    return { rows: statement.all(params) };
  }
  const result = statement.run(params);
  return { rows: [], lastInsertRowid: result.lastInsertRowid, changes: result.changes };
}

initializeDatabase().catch((error) => {
  console.error('Unable to initialize database schema:', error);
  process.exit(1);
});

module.exports = {
  query,
  pool,
  sqliteDb,
  usingPostgres,
};
