const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        amount REAL,
        type TEXT,
        mainCategory TEXT,
        subcategory TEXT,
        notes TEXT,
        title TEXT,
        seriesId TEXT,
        receiptUrl TEXT
      )
    `);
  }
});

module.exports = db;
