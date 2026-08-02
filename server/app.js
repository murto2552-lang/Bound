const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const env = require('./env');
const { dbGet, dbAll, dbRun } = require('./db');
const authRoutes = require('./authRoutes');
const { authenticateToken, authenticateAdmin } = require('./middleware');

const app = express();

// Behind Render/Vercel's proxy: trust it so req.protocol is https and Secure cookies work.
app.set('trust proxy', 1);

app.use(helmet());

// For Vercel, requests to /v1 come from the same origin, but we keep CORS for local dev / cross-domain setups
app.use(
  cors({
    origin: env.CLIENT_ORIGINS ? env.CLIENT_ORIGINS.split(',') : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Support local uploads directory or Vercel's /tmp
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Restrict uploads to images, cap size at 5MB.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed'));
  },
});

// --- Auth ---
app.use('/v1/auth', authRoutes);

// --- User Profile Routes ---
app.get('/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    const row = await dbGet(
      'SELECT id, firstName, lastName, email, avatarUrl, provider, promptpayId, qrCodeUrl FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.put('/v1/users/profile', authenticateToken, async (req, res) => {
  const { promptpayId } = req.body;
  try {
    await dbRun('UPDATE users SET promptpayId = ? WHERE id = ?', [promptpayId, req.user.id]);
    res.json({ success: true, promptpayId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/v1/users/qrcode', authenticateToken, upload.single('qrCode'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // For Vercel, note that local file storage is ephemeral
  const qrCodeUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  try {
    await dbRun('UPDATE users SET qrCodeUrl = ? WHERE id = ?', [qrCodeUrl, req.user.id]);
    res.json({ success: true, qrCodeUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save QR code' });
  }
});

// --- Protected Transaction Routes ---
app.get('/v1/transactions', authenticateToken, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [req.user.id]);
    res.json(rows.map((r) => ({ ...r, id: r.id.toString(), amount: Number(r.amount) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/v1/transactions', authenticateToken, upload.single('receipt'), async (req, res) => {
  const { date, amount, type, mainCategory, subcategory, notes, title, seriesId } = req.body;
  const userId = req.user.id;
  const receiptUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

  try {
    const { lastID } = await dbRun(
      `INSERT INTO transactions (userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, date, amount, type, mainCategory, subcategory, notes || '', title || '', seriesId || null, receiptUrl]
    );
    res.json({ id: lastID.toString(), userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/v1/transactions/:id', authenticateToken, async (req, res) => {
  try {
    await dbRun('DELETE FROM transactions WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    res.json({ success: true, deletedID: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/v1/transactions/series/:seriesId', authenticateToken, async (req, res) => {
  try {
    const { changes } = await dbRun('DELETE FROM transactions WHERE seriesId = ? AND userId = ?', [
      req.params.seriesId,
      req.user.id,
    ]);
    res.json({ success: true, deletedCount: changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Routes ---
app.get('/v1/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, firstName, lastName, email, provider, role FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/v1/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const userResult = await dbGet('SELECT COUNT(*) as totalUsers FROM users');
    const txResult = await dbGet('SELECT COUNT(*) as totalTx, SUM(amount) as totalAmount FROM transactions');
    res.json({
      totalUsers: userResult.totalUsers,
      totalTransactions: txResult.totalTx,
      totalAmount: txResult.totalAmount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React frontend (All-in-One for Render)
// Always serve static if dist/ exists, regardless of NODE_ENV.
// On Vercel, this block is skipped — Vercel handles static files itself.
const distPath = path.join(__dirname, '../dist');
console.log(`[Boot] NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL || 'unset'}`);
console.log(`[Boot] Looking for frontend build at: ${distPath}`);
console.log(`[Boot] dist exists: ${fs.existsSync(distPath)}`);

if (!isVercel) {
  if (fs.existsSync(distPath)) {
    console.log('[Boot] Serving React app from dist/ ...');
    app.use(express.static(distPath));
    // SPA catch-all: serve index.html for any path not matched above (React Router)
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.error(`[Boot] WARNING: dist/ NOT found at ${distPath}. Running in API-only mode.`);
    app.use((req, res) => {
      res.status(503).send(
        '<h1>Frontend not built yet</h1>' +
        `<p>Expected <code>dist/</code> at: ${distPath}</p>` +
        '<p>Build Command must be: <code>npm install --include=dev &amp;&amp; npm run build &amp;&amp; cd server &amp;&amp; npm install</code></p>'
      );
    });
  }
}

// Multer / generic error handler (must be last)
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = app;

