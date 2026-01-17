const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, 'wasteless.db');

let db = null;
let SQL = null;

async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper to run a query and return all results
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to run a query and return first result
function get(sql, params = []) {
  const results = all(sql, params);
  return results[0] || null;
}

// Helper to run a query (insert/update/delete)
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return {
    lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0,
    changes: db.getRowsModified()
  };
}

// Helper to execute multiple statements
function exec(sql) {
  db.exec(sql);
  saveDatabase();
}

module.exports = {
  initDatabase,
  getDatabase,
  saveDatabase,
  closeDatabase,
  dbPath,
  all,
  get,
  run,
  exec
};
