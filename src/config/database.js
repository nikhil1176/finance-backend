const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db;
let SQL;
let dbPath;

async function initDatabase(customPath = null) {
  if (db) return db;

  SQL = await initSqlJs();
  dbPath = customPath || process.env.DB_PATH || './data/finance.db';
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initializeSchema(db);
  return db;
}

function getDatabase() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const resolvedPath = dbPath || process.env.DB_PATH || './data/finance.db';
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = db.export();
  fs.writeFileSync(resolvedPath, Buffer.from(data));
}

function initializeSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'analyst', 'viewer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_records_user_id ON financial_records(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_records_type ON financial_records(type)',
    'CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category)',
    'CREATE INDEX IF NOT EXISTS idx_records_date ON financial_records(date)',
    'CREATE INDEX IF NOT EXISTS idx_records_is_deleted ON financial_records(is_deleted)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)',
  ];
  indexes.forEach(idx => database.run(idx));
}

function closeDatabase() {
  if (db) { saveDatabase(); db.close(); db = null; }
}

function resetDatabase() {
  if (db) { db.close(); db = null; }
}

module.exports = { initDatabase, getDatabase, saveDatabase, closeDatabase, resetDatabase };