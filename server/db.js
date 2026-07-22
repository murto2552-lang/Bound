const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Enforce foreign keys (off by default in SQLite)
db.run('PRAGMA foreign_keys = ON');

/**
 * Add a column only if it does not already exist. SQLite has no
 * "ADD COLUMN IF NOT EXISTS", so we swallow the duplicate-column error.
 * This is our lightweight migration mechanism — NEVER drop tables here.
 */
function addColumnIfMissing(table, columnDef) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, (err) => {
    if (err && !/duplicate column/i.test(err.message)) {
      console.error(`Migration warning on ${table}.${columnDef}:`, err.message);
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password TEXT,                 -- nullable: Google-only users have no password
      provider TEXT DEFAULT 'local', -- 'local' | 'google'
      googleId TEXT,
      avatarUrl TEXT,
      role TEXT DEFAULT 'user',      -- 'user' | 'admin'
      promptpayId TEXT,
      qrCodeUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrations for pre-existing databases (safe: ignore if column exists)
  addColumnIfMissing('users', 'provider TEXT DEFAULT \'local\'');
  addColumnIfMissing('users', 'googleId TEXT');
  addColumnIfMissing('users', 'avatarUrl TEXT');
  addColumnIfMissing('users', 'role TEXT DEFAULT \'user\'');
  addColumnIfMissing('users', 'promptpayId TEXT');
  addColumnIfMissing('users', 'qrCodeUrl TEXT');
  addColumnIfMissing('users', 'createdAt TEXT');

  db.run('CREATE INDEX IF NOT EXISTS idx_users_googleId ON users(googleId)');

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
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Hashed refresh tokens so sessions can be revoked (logout / rotation)
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      tokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_userId ON refresh_tokens(userId)');
});

// --- Promise helpers for clean async/await in route handlers ---
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

module.exports = db;
module.exports.dbGet = dbGet;
module.exports.dbAll = dbAll;
module.exports.dbRun = dbRun;
