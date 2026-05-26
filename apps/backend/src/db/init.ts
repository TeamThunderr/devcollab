import fs from 'fs'
import path from 'path'
import { pool } from './client'

export async function initDatabase() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir)
    
    // Sort files alphabetically to ensure they run in order (001_..., 002_...)
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

    for (const file of sqlFiles) {
      const sqlPath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(sqlPath, 'utf8')
      await pool.query(sql)
    }
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
