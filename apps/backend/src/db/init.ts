import fs from 'fs'
import path from 'path'
import { pool } from './client'

export async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '001_initial_schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    await pool.query(sql)
    console.log('✅ Database schema initialized')
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️  PostgreSQL not reachable yet — schema init skipped')
      console.warn('    Make sure Docker postgres is running: npm run docker:up')
    } else {
      console.warn('⚠️  Database init warning:', err.message)
    }
  }
}
