const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
]

export function validateEnv() {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '))
    process.exit(1)
  }
  console.log('✅ Environment variables validated')
}
