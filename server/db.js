const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database.');
    
    // We are dropping the transactions table to reset and add userId
    db.serialize(() => {
      db.run(`DROP TABLE IF EXISTS transactions`);
      
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT,
          lastName TEXT,
          email TEXT UNIQUE,
          password TEXT,
          promptpayId TEXT
        )
      `);

      // Attempt to add column for existing databases (ignore error if it already exists)
      db.run(`ALTER TABLE users ADD COLUMN promptpayId TEXT`, (err) => {});

      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          date TEXT,
          amount REAL,
          type TEXT,
          mainCategory TEXT,
          subcategory TEXT,
          notes TEXT,
          title TEXT,
          seriesId TEXT,
          receiptUrl TEXT,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `);
    });
  }
});

module.exports = db;
