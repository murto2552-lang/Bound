const path = require('path');
const { createClient } = require('@libsql/client');

// In production point at Turso (libsql://... + auth token).
// In local dev fall back to a plain SQLite file — same SQL, no cloud needed.
const url =
  process.env.TURSO_DATABASE_URL ||
  `file:${path.resolve(__dirname, 'finance.db')}`;

const client = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

// --- Promise helpers (same interface the routes already use) ---
const dbGet = async (sql, args = []) => {
  const rs = await client.execute({ sql, args });
  return rs.rows[0];
};

const dbAll = async (sql, args = []) => {
  const rs = await client.execute({ sql, args });
  return rs.rows;
};

const dbRun = async (sql, args = []) => {
  const rs = await client.execute({ sql, args });
  return {
    lastID: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined,
    changes: rs.rowsAffected,
  };
};

// Add a column only if it does not already exist (lightweight migration).
async function addColumnIfMissing(table, columnDef) {
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) {
      console.error(`Migration warning on ${table}.${columnDef}:`, err.message);
    }
  }
}

// Must be awaited before the server starts accepting requests.
async function init() {
  await client.execute('PRAGMA foreign_keys = ON');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password TEXT,
      provider TEXT DEFAULT 'local',
      googleId TEXT,
      avatarUrl TEXT,
      role TEXT DEFAULT 'user',
      promptpayId TEXT,
      qrCodeUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  await addColumnIfMissing('users', "provider TEXT DEFAULT 'local'");
  await addColumnIfMissing('users', 'googleId TEXT');
  await addColumnIfMissing('users', 'avatarUrl TEXT');
  await addColumnIfMissing('users', "role TEXT DEFAULT 'user'");
  await addColumnIfMissing('users', 'promptpayId TEXT');
  await addColumnIfMissing('users', 'qrCodeUrl TEXT');
  await addColumnIfMissing('users', 'createdAt TEXT');

  await client.execute('CREATE INDEX IF NOT EXISTS idx_users_googleId ON users(googleId)');

  await client.execute(`
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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      tokenHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS idx_refresh_userId ON refresh_tokens(userId)');

  console.log(`Database ready (${process.env.TURSO_DATABASE_URL ? 'Turso' : 'local SQLite file'}).`);
}

module.exports = { client, dbGet, dbAll, dbRun, init };
