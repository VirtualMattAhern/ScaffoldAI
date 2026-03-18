/**
 * Database schema - initializes SQLite (local) or runs Azure SQL migration (production).
 * Call ensureSchema() at app startup before handling requests.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb, isAzureSql } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initSqliteSchema() {
  const Database = (await import('better-sqlite3')).default;
  const dbDir = process.env.DATABASE_PATH
    ? path.dirname(process.env.DATABASE_PATH)
    : path.join(__dirname, '../../../data');
  const dbPath = process.env.DATABASE_PATH ?? path.join(dbDir, 'skafoldai.db');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('repeat', 'playbook')),
      steps TEXT NOT NULL,
      last_used_at TEXT,
      suggested_by_ai INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal_id TEXT,
      playbook_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'paused', 'done')),
      type TEXT NOT NULL CHECK (type IN ('one_off', 'repeat', 'playbook')),
      timebox_minutes INTEGER,
      next_step TEXT,
      top3_candidate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      paused_until TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (goal_id) REFERENCES goals(id),
      FOREIGN KEY (playbook_id) REFERENCES playbooks(id)
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      chosen_option INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
    CREATE TABLE IF NOT EXISTS brain_dumps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      week_start TEXT NOT NULL,
      converted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS focus_sentences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sentence TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      high_contrast INTEGER DEFAULT 0,
      font_size_percent INTEGER DEFAULT 100,
      dyslexia_font INTEGER DEFAULT 0,
      reduce_motion INTEGER DEFAULT 0,
      focus_mode INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_playbooks_user ON playbooks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_decisions_task ON decisions(task_id);
  `);

  const devUserId = 'dev-user-001';
  db.prepare('INSERT OR IGNORE INTO users (id, email, display_name) VALUES (?, ?, ?)').run(devUserId, 'dev@skafoldai.local', 'Dev User');
  try { db.prepare('ALTER TABLE user_settings ADD COLUMN reduce_motion INTEGER DEFAULT 0').run(); } catch {}
  try { db.prepare('ALTER TABLE user_settings ADD COLUMN focus_mode INTEGER DEFAULT 0').run(); } catch {}
  db.close();
}

let _schemaInitialized = false;

export async function ensureSchema() {
  if (_schemaInitialized) return;
  if (isAzureSql()) {
    const db = await getDb();
    const sqlPath = path.join(__dirname, 'azure-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    // Run migration - SQL Server supports multiple statements in one batch
    await db.run(sql);
    _schemaInitialized = true;
  } else {
    await initSqliteSchema();
    _schemaInitialized = true;
  }
}
