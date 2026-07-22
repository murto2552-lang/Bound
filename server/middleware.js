const jwt = require('jsonwebtoken');
const env = require('./env');
const { ACCESS_COOKIE } = require('./tokens');

// Reads the access token from the httpOnly cookie (falls back to the
// Authorization header for API clients / tools).
function authenticateToken(req, res, next) {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  jwt.verify(token, env.JWT_ACCESS_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Session expired' });
    req.user = payload; // { id, role }
    next();
  });
}

// Admin access is now based on the authenticated user's role, or a
// constant-time-compared admin key for the standalone admin-app.
function authenticateAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();

  const provided = req.headers['x-admin-key'];
  if (provided && safeEqual(provided, env.ADMIN_KEY)) return next();

  return res.status(403).json({ error: 'Forbidden' });
}

function safeEqual(a, b) {
  const crypto = require('crypto');
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { authenticateToken, authenticateAdmin };
