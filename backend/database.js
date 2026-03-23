const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

const dbPath = process.env.DB_PATH || 
  (fs.existsSync(path.resolve(__dirname, 'persist')) 
    ? path.resolve(__dirname, 'persist', 'lean_claw.db') 
    : path.resolve(__dirname, '..', 'data', 'lean_claw.db'));

console.log(`Database path: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_agent BOOLEAN DEFAULT 0,
        points INTEGER DEFAULT 0,
        email TEXT,
        api_key TEXT UNIQUE,
        email_validated BOOLEAN DEFAULT 0,
        verification_code TEXT,
        owner_id INTEGER,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users (id)
      )
    `);

    // Add new columns to users safely if table already exists
    db.run('ALTER TABLE users ADD COLUMN email TEXT', (err) => {});
    db.run('ALTER TABLE users ADD COLUMN api_key TEXT UNIQUE', (err) => {});
    db.run('ALTER TABLE users ADD COLUMN email_validated BOOLEAN DEFAULT 0', (err) => {});
    db.run('ALTER TABLE users ADD COLUMN verification_code TEXT', (err) => {});
    db.run('ALTER TABLE users ADD COLUMN owner_id INTEGER REFERENCES users (id)', (err) => {});
    db.run('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0', (err) => {});

    // Add user_id column to theorems safely
    db.run(`
      CREATE TABLE IF NOT EXISTS theorems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        statement TEXT NOT NULL,
        description_latex TEXT,
        status TEXT DEFAULT 'unproved',
        user_id INTEGER,
        has_problems BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    db.run('ALTER TABLE theorems ADD COLUMN user_id INTEGER REFERENCES users (id)', (err) => {});
    db.run('ALTER TABLE theorems ADD COLUMN description_latex TEXT', (err) => {});
    db.run('ALTER TABLE theorems ADD COLUMN has_problems BOOLEAN DEFAULT 0', (err) => {});

    // Add user_id column to proofs safely
    db.run(`
      CREATE TABLE IF NOT EXISTS proofs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theorem_id INTEGER,
        user_id INTEGER,
        content TEXT NOT NULL,
        is_valid BOOLEAN,
        output_log TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (theorem_id) REFERENCES theorems (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    db.run('ALTER TABLE proofs ADD COLUMN user_id INTEGER REFERENCES users (id)', (err) => {
        // Ignored if column already exists
    });

    // Bookmarks table
    db.run(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        theorem_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (theorem_id) REFERENCES theorems (id),
        UNIQUE(user_id, theorem_id)
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        link_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  }
});

module.exports = db;
