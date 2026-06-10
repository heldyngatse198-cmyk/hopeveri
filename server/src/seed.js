const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./db');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@hopeveri.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

async function seedAdmin() {
  const existing = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length > 0) {
    console.log('⚠️  Admin already exists — skipping seed.');
    process.exit(0);
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(adminPassword, 10);

  await query(
    `INSERT INTO users (id, email, password, role, subscription, daily_quota, quota_reset_at)
     VALUES ($1, $2, $3, 'admin', 'yearly', 9999, $4)`,
    [id, adminEmail, hash, new Date().toISOString().slice(0, 10)]
  );

  console.log(`✅ Admin seeded: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
