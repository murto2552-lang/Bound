const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('./env');
const { dbGet, dbRun } = require('./db');

const ACCESS_COOKIE = 'bound_access';
const REFRESH_COOKIE = 'bound_refresh';

// Parse a short TTL string like "15m" / "7d" into milliseconds (for cookie maxAge).
function ttlToMs(ttl) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2]];
  return n * unit;
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role || 'user' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProd, // HTTPS-only in production
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

// Create an opaque refresh token, store only its hash, return the raw value.
async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + ttlToMs(env.REFRESH_TOKEN_TTL)).toISOString();
  await dbRun(
    'INSERT INTO refresh_tokens (userId, tokenHash, expiresAt) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
  return raw;
}

// Validate a raw refresh token; returns the row or null.
async function findRefreshToken(raw) {
  if (!raw) return null;
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const row = await dbGet('SELECT * FROM refresh_tokens WHERE tokenHash = ?', [tokenHash]);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await dbRun('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
    return null;
  }
  return row;
}

async function revokeRefreshToken(raw) {
  if (!raw) return;
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await dbRun('DELETE FROM refresh_tokens WHERE tokenHash = ?', [tokenHash]);
}

// Issue both cookies for a freshly authenticated user.
async function setAuthCookies(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ttlToMs(env.ACCESS_TOKEN_TTL)));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(ttlToMs(env.REFRESH_TOKEN_TTL)));
}

function clearAuthCookies(res) {
  const opts = { ...cookieOptions(0) };
  delete opts.maxAge;
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccessToken,
  cookieOptions,
  ttlToMs,
  issueRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};
