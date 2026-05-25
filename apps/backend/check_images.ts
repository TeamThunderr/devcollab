import { pool } from './src/db/client';

async function check() {
  try {
    const res = await pool.query('SELECT id, filename, content_type, length(data) as size FROM uploaded_images ORDER BY created_at DESC LIMIT 5');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
