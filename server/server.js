const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'bound-super-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// --- Authentication Routes ---

app.post('/v1/auth/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Please provide all fields' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);

  const sql = `INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)`;
  db.run(sql, [firstName, lastName, email, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    const token = jwt.sign({ id: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: this.lastID, firstName, lastName, email } });
  });
});

app.post('/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } });
  });
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- Protected Transaction Routes ---

app.get('/v1/transactions', authenticateToken, (req, res) => {
  db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formattedRows = rows.map(r => ({ ...r, id: r.id.toString(), amount: Number(r.amount) }));
    res.json(formattedRows);
  });
});

app.post('/v1/transactions', authenticateToken, upload.single('receipt'), (req, res) => {
  const { date, amount, type, mainCategory, subcategory, notes, title, seriesId } = req.body;
  const userId = req.user.id;
  let receiptUrl = null;
  if (req.file) {
    receiptUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const sql = `INSERT INTO transactions (userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [userId, date, amount, type, mainCategory, subcategory, notes || '', title || '', seriesId || null, receiptUrl];
  
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      id: this.lastID.toString(), userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl
    });
  });
});

app.delete('/v1/transactions/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM transactions WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedID: req.params.id });
  });
});

app.delete('/v1/transactions/series/:seriesId', authenticateToken, (req, res) => {
  db.run('DELETE FROM transactions WHERE seriesId = ? AND userId = ?', [req.params.seriesId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedCount: this.changes });
  });
});

// --- Admin Routes ---

app.get('/v1/admin/users', authenticateToken, (req, res) => {
  db.all('SELECT id, firstName, lastName, email FROM users ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/v1/admin/stats', authenticateToken, (req, res) => {
  db.get('SELECT COUNT(*) as totalUsers FROM users', [], (err, userResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as totalTx, SUM(amount) as totalAmount FROM transactions', [], (err, txResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        totalUsers: userResult.totalUsers,
        totalTransactions: txResult.totalTx,
        totalAmount: txResult.totalAmount || 0
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
