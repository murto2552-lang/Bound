require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`\n[FATAL] Missing required env var: ${name}. See server/.env.example\n`);
    process.exit(1);
  }
  return value;
}

const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',

  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',

  ADMIN_KEY: required('ADMIN_KEY'),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
};

module.exports = env;
