// server/src/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/devflow.db';

function ensureDirForFile(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDirForFile(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#4f46e5',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#10b981'
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'backlog', -- backlog|in_progress|review|done
      priority INTEGER DEFAULT 2,     -- 1 high,2 normal,3 low
      due_date TEXT,                  -- ISO date
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT,
      tag_id TEXT,
      PRIMARY KEY(task_id, tag_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'text' -- text|number|date|url
    );
    CREATE TABLE IF NOT EXISTS task_custom_fields (
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY(task_id, field_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      kind TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ---- SEED: теги (если нет ни одного) ----
  const tagCount = db.prepare('SELECT COUNT(*) c FROM tags').get().c;
  if (tagCount === 0) {
    const insTag = db.prepare('INSERT INTO tags(id, name, color) VALUES(?,?,?)');
    insTag.run(randomUUID(), 'frontend', '#06b6d4');
    insTag.run(randomUUID(), 'backend', '#10b981');
    insTag.run(randomUUID(), 'bug', '#ef4444');
    insTag.run(randomUUID(), 'feature', '#8b5cf6');
  }

  // ---- SEED: проект (если нет ни одного) ----
  let projectRow = db.prepare('SELECT id FROM projects ORDER BY created_at LIMIT 1').get();
  if (!projectRow) {
    const projectId = randomUUID();
    db.prepare('INSERT INTO projects(id, name, color) VALUES (?,?,?)')
      .run(projectId, 'DevFlow Roadmap', '#4f46e5');
    projectRow = { id: projectId };
  }

  // ---- SEED: демо-задачи (если их нет) ----
  const tasksCount = db.prepare('SELECT COUNT(*) c FROM tasks').get().c;
  if (tasksCount === 0) {
    const createTask = db.prepare(`
      INSERT INTO tasks(id, project_id, title, description, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const today = new Date().toISOString().slice(0, 10);

    const t1 = randomUUID();
    createTask.run(
      t1,
      projectRow.id,
      'Design UI kit',
      'Create a minimal, beautiful design.\\n- Sidebar\\n- Kanban\\n- Modal',
      'in_progress',
      2,
      today
    );

    const t2 = randomUUID();
    createTask.run(
      t2,
      projectRow.id,
      'Build API',
      'Implement Express endpoints for tasks/projects/tags.',
      'backlog',
      1,
      null
    );

    const t3 = randomUUID();
    createTask.run(
      t3,
      projectRow.id,
      'Implement Kanban',
      'Drag & drop (later), quick status switch.',
      'review',
      2,
      today
    );

    const t4 = randomUUID();
    createTask.run(
      t4,
      projectRow.id,
      'Ship MVP',
      'Bundle client and serve from server in production.',
      'backlog',
      1,
      null
    );

    const linkTag = db.prepare(
      'INSERT OR IGNORE INTO task_tags(task_id, tag_id) VALUES(?, (SELECT id FROM tags WHERE name=?))'
    );
    linkTag.run(t1, 'frontend');
    linkTag.run(t2, 'backend');
    linkTag.run(t3, 'frontend');
    linkTag.run(t3, 'feature');

    // custom fields (поля + значения)
    const addField = db.prepare('INSERT OR IGNORE INTO custom_fields(id, key, type) VALUES (?,?,?)');
    const cf1 = randomUUID(); addField.run(cf1, 'estimate_hours', 'number');
    const cf2 = randomUUID(); addField.run(cf2, 'repo', 'url');

    const setField = db.prepare('INSERT OR REPLACE INTO task_custom_fields(task_id, field_id, value) VALUES (?,?,?)');
    setField.run(t1, cf1, '5');
    setField.run(t2, cf2, 'https://github.com/you/devflow');
  }
}

module.exports = { db, migrate };
