import { Pool, PoolClient, QueryResultRow } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const result = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      console.log('Query executed', { text: text.slice(0, 50), duration, rows: result.rowCount })
    }
    return result
  } catch (err) {
    console.error('Query error:', { text: text.slice(0, 50), error: err })
    throw err
  }
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export { pool }
export default pool
