import fs from 'fs'
import path from 'path'
import { pool } from './client'

export async function initDatabase() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(sqlPath, 'utf8')
      try {
        await pool.query(sql)
        console.log(`✅ Applied migration: ${file}`)
      } catch (err: any) {
        if (err.code === '42P07' || err.message?.includes('already exists')) {
          console.log(`✅ Migration ${file} already applied — skipping`)
        } else {
          throw err
        }
      }
    }
    console.log('✅ All migrations applied successfully')
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️  PostgreSQL not reachable yet — schema init skipped')
      console.warn('    Make sure Docker postgres is running: npm run docker:up')
    } else {
      console.warn('⚠️  Database init warning:', err.message)
    }
  }
}
