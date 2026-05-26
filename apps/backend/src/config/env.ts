/**
 * apps/backend/src/config/env.ts
 *
 * Validates all required environment variables at startup.
 * The process exits immediately if any required var is missing —
 * this is intentional: it's better to fail loudly on startup than
 * to silently fail at runtime when a feature is first used.
 */

interface EnvConfig {
  // Server
  NODE_ENV:             string;
  PORT:                 number;

  // Database
  DATABASE_URL:         string;

  // Redis
  REDIS_URL:            string;

  // Auth
  JWT_SECRET:           string;
  JWT_REFRESH_SECRET:   string;

  // CORS
  FRONTEND_URL:         string;

  // AI (optional — warns if missing)
  GEMINI_API_KEY:       string | undefined;
  GEMINI_MODEL:         string;
  GEMINI_FALLBACK_MODEL:string;

  // Payments (optional — warns if missing)
  RAZORPAY_KEY_ID:      string | undefined;
  RAZORPAY_KEY_SECRET:  string | undefined;

  // Email (optional — warns if missing)
  SMTP_HOST:            string | undefined;
  SMTP_PORT:            number;
  SMTP_USER:            string | undefined;
  SMTP_PASS:            string | undefined;
}

// Variables that MUST be set — process exits immediately if missing
const REQUIRED: (keyof EnvConfig)[] = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
];

// Variables that are missing in production — log a warning but don't crash
const OPTIONAL_WARN: (keyof EnvConfig)[] = [
  'GEMINI_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
];

export function validateEnv(): EnvConfig {
  // ── Check required vars ──────────────────────────────────────────────────
  const missing = REQUIRED.filter((key) => !process.env[key as string]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\nSet these variables and restart the server.');
    process.exit(1);
  }

  // ── Validate JWT minimum length (security check) ─────────────────────────
  const jwtSecret = process.env.JWT_SECRET!;
  const jwtRefresh = process.env.JWT_REFRESH_SECRET!;
  if (process.env.NODE_ENV === 'production') {
    if (jwtSecret.length < 32) {
      console.error('❌ JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }
    if (jwtRefresh.length < 32) {
      console.error('❌ JWT_REFRESH_SECRET must be at least 32 characters in production');
      process.exit(1);
    }
    if (jwtSecret === jwtRefresh) {
      console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET must be DIFFERENT values');
      process.exit(1);
    }
  }

  // ── Warn about optional but recommended vars ──────────────────────────────
  const missingOptional = OPTIONAL_WARN.filter((key) => !process.env[key as string]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set (features will be degraded):');
    missingOptional.forEach((key) => console.warn(`   • ${key}`));
  }

  console.log('✅ Environment variables validated');

  return {
    NODE_ENV:              process.env.NODE_ENV ?? 'development',
    PORT:                  Number(process.env.PORT ?? 3000),
    DATABASE_URL:          process.env.DATABASE_URL!,
    REDIS_URL:             process.env.REDIS_URL!,
    JWT_SECRET:            jwtSecret,
    JWT_REFRESH_SECRET:    jwtRefresh,
    FRONTEND_URL:          process.env.FRONTEND_URL!,
    GEMINI_API_KEY:        process.env.GEMINI_API_KEY,
    GEMINI_MODEL:          process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-1.5-flash-8b',
    RAZORPAY_KEY_ID:       process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET:   process.env.RAZORPAY_KEY_SECRET,
    SMTP_HOST:             process.env.SMTP_HOST,
    SMTP_PORT:             Number(process.env.SMTP_PORT ?? 587),
    SMTP_USER:             process.env.SMTP_USER,
    SMTP_PASS:             process.env.SMTP_PASS,
  };
}

/** Typed, validated environment — import this instead of process.env */
export const env = validateEnv();
