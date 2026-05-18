import { Pool, QueryResult, QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

/**
 * Execute a parameterised SQL query using the shared connection pool.
 *
 * @param text   - SQL query string (use $1, $2 … for parameters)
 * @param params - Optional array of parameter values
 * @returns      QueryResult typed to the row shape T
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.debug(`Executed query in ${duration}ms — rows: ${result.rowCount}`);
  return result;
}
