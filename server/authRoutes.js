const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');

const env = require('./env');
const { dbGet, dbRun } = require('./db');
const {
  setAuthCookies,
  clearAuthCookies,
  signAccessToken,
  cookieOptions,
  ttlToMs,
  findRefreshToken,
  revokeRefreshToken,
  issueRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} = require('./tokens');
const { authenticateToken } = require('./middleware');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// Brute-force / credential-stuffing protection on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// --- Validation schemas ---
const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(72), // bcrypt truncates >72 bytes
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

function publicUser(u) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    avatarUrl: u.avatarUrl || null,
    provider: u.provider || 'local',
    role: u.role || 'user',
  };
}

// --- Register ---
router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }
  const { firstName, lastName, email, password } = parsed.data;

  try {
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      // Neutral message — do not confirm which emails are registered.
      return res.status(409).json({ error: 'Unable to register with these details' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { lastID } = await dbRun(
      `INSERT INTO users (firstName, lastName, email, password, provider) VALUES (?, ?, ?, ?, 'local')`,
      [firstName, lastName, email, hashedPassword]
    );

    const user = { id: lastID, firstName, lastName, email, provider: 'local', role: 'user' };
    await setAuthCookies(res, user);
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Login ---
router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }
  const { email, password } = parsed.data;

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

    // Constant-ish behaviour: always run a bcrypt compare to avoid timing/enumeration.
    const hash = user?.password || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const isValid = await bcrypt.compare(password, hash);

    if (!user || !user.password || !isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await setAuthCookies(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Google Sign-In (verify ID token from Google Identity Services) ---
router.post('/google', authLimiter, async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  const { credential } = req.body; // ID token (JWT) from the browser
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account not verified' });
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;

    let user = await dbGet('SELECT * FROM users WHERE googleId = ? OR email = ?', [googleId, email]);

    if (!user) {
      // First time: create a Google-provider account (no password).
      const { lastID } = await dbRun(
        `INSERT INTO users (firstName, lastName, email, provider, googleId, avatarUrl, role)
         VALUES (?, ?, ?, 'google', ?, ?, 'user')`,
        [payload.given_name || '', payload.family_name || '', email, googleId, payload.picture || null]
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [lastID]);
    } else if (!user.googleId) {
      // Existing local account with same email: link the Google identity.
      await dbRun('UPDATE users SET googleId = ?, avatarUrl = COALESCE(avatarUrl, ?) WHERE id = ?', [
        googleId,
        payload.picture || null,
        user.id,
      ]);
      user.googleId = googleId;
    }

    await setAuthCookies(res, user);
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('google auth error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// --- Refresh access token (rotates the refresh token) ---
router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  try {
    const row = await findRefreshToken(raw);
    if (!row) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [row.userId]);
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Rotate: revoke the used refresh token, issue a new pair.
    await revokeRefreshToken(raw);
    const accessToken = signAccessToken(user);
    const newRefresh = await issueRefreshToken(user.id);
    res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ttlToMs(env.ACCESS_TOKEN_TTL)));
    res.cookie(REFRESH_COOKIE, newRefresh, cookieOptions(ttlToMs(env.REFRESH_TOKEN_TTL)));

    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('refresh error:', err.message);
    res.status(401).json({ error: 'Session expired' });
  }
});

// --- Current user ---
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// --- Logout ---
router.post('/logout', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  await revokeRefreshToken(raw);
  clearAuthCookies(res);
  res.json({ success: true });
});

module.exports = router;
