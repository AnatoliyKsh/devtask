const express = require('express');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const router = express.Router();

function rowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// List tasks with filters (supports tagId or tag name)
// List tasks with filters (supports ?projectId=...&tagId=... or &tag=name)
router.get('/', (req, res) => {
  const { q, status, projectId, tagId, tag, due } = req.query;

  const hasTag = !!tagId || !!tag;

  let sql = `
    SELECT DISTINCT t.*
    FROM tasks t
    ${hasTag ? 'JOIN task_tags tt ON tt.task_id = t.id JOIN tags tg ON tg.id = tt.tag_id' : ''}
    WHERE 1=1
  `;
  const params = [];

  if (projectId) { sql += ' AND t.project_id = ?'; params.push(projectId); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (q) { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (due === 'today') {
    const today = new Date().toISOString().slice(0, 10);
    sql += ' AND t.due_date = ?'; params.push(today);
  }
  if (tagId) { sql += ' AND tg.id = ?'; params.push(tagId); }
  else if (tag) { sql += ' AND tg.name = ?'; params.push(tag); }

  sql += ' ORDER BY t.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToTask));
});



// Get one
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  const task = rowToTask(row);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const tags = db.prepare(`SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id=tt.tag_id WHERE tt.task_id=?`).all(task.id);
  const subtasks = db.prepare(`SELECT * FROM subtasks WHERE task_id=?`).all(task.id);
  const fields = db.prepare(`
    SELECT cf.id, cf.key, cf.type, tcf.value 
    FROM custom_fields cf 
    JOIN task_custom_fields tcf ON cf.id = tcf.field_id 
    WHERE tcf.task_id=?
  `).all(task.id);
  const comments = db.prepare(`SELECT * FROM comments WHERE task_id=? ORDER BY created_at ASC`).all(task.id);

  res.json({ ...task, tags, subtasks, customFields: fields, comments });
});

// Create
router.post('/', (req, res) => {
  const { projectId = null, title, description = '', status = 'backlog', priority = 2, dueDate = null, tags = [], subtasks = [], customFields = {} } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
  const id = nanoid();
  db.prepare(`INSERT INTO tasks(id, project_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, title, description, status, priority, dueDate);
  db.prepare(`INSERT INTO activities(id, task_id, kind, payload) VALUES(?, ?, ?, ?)`)
    .run(nanoid(), id, 'task_created', JSON.stringify({ title }));

  for (const name of tags) {
    const tagRow = db.prepare(`SELECT * FROM tags WHERE name=?`).get(name);
    if (tagRow) {
      db.prepare(`INSERT OR IGNORE INTO task_tags(task_id, tag_id) VALUES(?, ?)`).run(id, tagRow.id);
    }
  }
  for (const st of subtasks) {
    db.prepare(`INSERT INTO subtasks(id, task_id, title, done) VALUES(?, ?, ?, ?)`)
      .run(nanoid(), id, st.title || 'Subtask', st.done ? 1 : 0);
  }
  for (const key in customFields) {
    const field = db.prepare(`SELECT * FROM custom_fields WHERE key=?`).get(key);
    if (field) {
      db.prepare(`INSERT INTO task_custom_fields(task_id, field_id, value) VALUES(?, ?, ?)`)
        .run(id, field.id, String(customFields[key]));
    }
  }
  const row = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  res.status(201).json({ id, ...row });
});

// Update
router.put('/:id', (req, res) => {
  const { title, description, status, priority, dueDate, projectId } = req.body;
  const existing = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, project_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title ?? existing.title, description ?? existing.description, status ?? existing.status, priority ?? existing.priority, dueDate ?? existing.due_date, projectId ?? existing.project_id, req.params.id);
  res.json({ ok: true });
});

// Patch status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['backlog', 'in_progress', 'review', 'done'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  const row = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  db.prepare(`INSERT INTO activities(id, task_id, kind, payload) VALUES(?, ?, ?, ?)`)
    .run(nanoid(), req.params.id, 'status_changed', JSON.stringify({ from: row.status, to: status }));
  res.json({ ok: true });
});

// Manage tags for a task
router.post('/:id/tags', (req, res) => {
  const { tags = [] } = req.body;
  const taskId = req.params.id;
  db.prepare('DELETE FROM task_tags WHERE task_id=?').run(taskId);
  for (const name of tags) {
    const tag = db.prepare('SELECT * FROM tags WHERE name=?').get(name);
    if (tag) db.prepare('INSERT OR IGNORE INTO task_tags(task_id, tag_id) VALUES(?, ?)').run(taskId, tag.id);
  }
  res.json({ ok: true });
});

// Subtasks
router.post('/:id/subtasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = nanoid();
  db.prepare('INSERT INTO subtasks(id, task_id, title, done) VALUES(?, ?, ?, 0)').run(id, req.params.id, title);
  res.status(201).json({ id, title, done: 0 });
});
router.patch('/subtasks/:subId', (req, res) => {
  const { title, done } = req.body;
  const row = db.prepare('SELECT * FROM subtasks WHERE id=?').get(req.params.subId);
  if (!row) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE subtasks SET title=?, done=? WHERE id=?').run(title ?? row.title, typeof done === 'number' ? done : (done ? 1 : row.done), req.params.subId);
  res.json({ ok: true });
});
router.delete('/subtasks/:subId', (req, res) => {
  db.prepare('DELETE FROM subtasks WHERE id=?').run(req.params.subId);
  res.json({ ok: true });
});

// Delete task
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
