const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./src/db');

async function test() {
  try {
    const result = await query('SELECT 1 as test');
    console.log('DB OK:', JSON.stringify(result));
    
    const email = 'test-' + Date.now() + '@test.com';
    const password = 'test123456';
    
    const existing = await query('SELECT id, confirmed FROM users WHERE email = $1', [email]);
    console.log('Existing check:', JSON.stringify(existing));
    
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    const today = new Date().toISOString().slice(0, 10);
    const confirmationToken = uuidv4();
    const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await query(
      `INSERT INTO users (id, email, password, role, subscription, daily_quota, quota_reset_at, confirmed, confirmation_token, confirmation_token_expires_at)
       VALUES ($1, $2, $3, 'user', 'free', 5, $4, false, $5, $6)`,
      [id, email, hash, today, confirmationToken, confirmationExpiry]
    );
    console.log('INSERT OK');
    
    const user = await query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('User found:', user.rows.length > 0);
    if (user.rows[0]) {
      console.log('User email:', user.rows[0].email);
      console.log('User confirmed:', user.rows[0].confirmed);
    }
    
    // Cleanup
    await query('DELETE FROM users WHERE id = $1', [id]);
    console.log('DELETE OK');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
test();
