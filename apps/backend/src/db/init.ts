import fs from 'fs'
import path from 'path'
import { pool } from './client'

export async function initDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '001_initial_schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    await pool.query(sql)

    try {
      const sqlPath2 = path.join(__dirname, 'migrations', '002_add_platform_role.sql')
      const sql2 = fs.readFileSync(sqlPath2, 'utf8')
      await pool.query(sql2)
    } catch (e: any) {
      if (e.code !== '42701') {
        console.warn('⚠️  Migration 002 warning:', e.message)
      }
    }

    try {
      const sqlPath3 = path.join(__dirname, 'migrations', '003_add_invited_by.sql')
      const sql3 = fs.readFileSync(sqlPath3, 'utf8')
      await pool.query(sql3)
    } catch (e: any) {
      if (e.code !== '42701') {
        console.warn('⚠️  Migration 003 warning:', e.message)
      }
    }

    console.log('✅ Database schema initialized')
  } catch (err: any) {
    if (err.code === '42P07' || err.message?.includes('already exists')) {
      console.log('✅ Database schema already exists — skipping')
    } else if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️  PostgreSQL not reachable yet — schema init skipped')
      console.warn('    Make sure Docker postgres is running: npm run docker:up')
    } else {
      console.warn('⚠️  Database init warning:', err.message)
    }
  }
}
