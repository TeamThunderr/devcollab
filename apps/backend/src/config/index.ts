/**
 * apps/backend/src/config/index.ts
 *
 * Central configuration barrel — import all server config from here
 * rather than reading process.env scattered across the codebase.
 */

export { aiConfig } from "./ai.config";
export type { AIConfig } from "./ai.config";

// ─── Server ────────────────────────────────────────────────────────────────────

export const serverConfig = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "https://devcollab-gamma.vercel.app",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: process.env.NODE_ENV !== "production",
} as const;

// ─── Database ──────────────────────────────────────────────────────────────────

export const dbConfig = {
  connectionString: process.env.DATABASE_URL ?? "",
} as const;

// ─── Redis ─────────────────────────────────────────────────────────────────────

export const redisConfig = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
} as const;
