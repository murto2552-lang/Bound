const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('/v1/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const formattedRows = rows.map(r => ({
      ...r,
      id: r.id.toString(),
      amount: Number(r.amount)
    }));
    res.json(formattedRows);
  });
});

app.post('/v1/transactions', upload.single('receipt'), (req, res) => {
  const { date, amount, type, mainCategory, subcategory, notes, title, seriesId } = req.body;
  let receiptUrl = null;
  if (req.file) {
    receiptUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const sql = `INSERT INTO transactions (date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [date, amount, type, mainCategory, subcategory, notes || '', title || '', seriesId || null, receiptUrl];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id: this.lastID.toString(),
      date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl
    });
  });
});

app.delete('/v1/transactions/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM transactions WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deletedID: id });
  });
});

app.delete('/v1/transactions/series/:seriesId', (req, res) => {
  const seriesId = req.params.seriesId;
  db.run('DELETE FROM transactions WHERE seriesId = ?', seriesId, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deletedCount: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
