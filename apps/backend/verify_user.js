const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://devcollab:devcollab123@127.0.0.1:5432/devcollab' });
pool.query("SELECT id, email, is_verified, verification_token FROM users WHERE email = 'mrmathesh14@gmail.com';")
  .then(res => {
    console.log(res.rows);
    return pool.query("UPDATE users SET is_verified = true WHERE email = 'mrmathesh14@gmail.com' RETURNING *;");
  })
  .then(res => {
    console.log('Updated:', res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
