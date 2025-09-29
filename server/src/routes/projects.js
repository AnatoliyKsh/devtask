const express = require('express');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, color='#4f46e5' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = nanoid();
  db.prepare('INSERT INTO projects(id, name, color) VALUES (?, ?, ?)').run(id, name, color);
  res.status(201).json({ id, name, color });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const { name=row.name, color=row.color } = req.body;
  db.prepare('UPDATE projects SET name=?, color=? WHERE id=?').run(name, color, req.params.id);
  res.json({ ok: true });
});

// Удалить проект И ВСЕ его задачи (+ связанные записи) в одной транзакции
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const tx = db.transaction((pid) => {
      // 1) Удаляем связанные записи по задачам этого проекта
      //    (если в схеме есть эти таблицы — они ссылаются на task_id)
      db.prepare(`
        DELETE FROM activities
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(pid);

      db.prepare(`
        DELETE FROM comments
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(pid);

      db.prepare(`
        DELETE FROM subtasks
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(pid);

      db.prepare(`
        DELETE FROM task_custom_fields
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(pid);

      db.prepare(`
        DELETE FROM task_tags
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(pid);

      // 2) Удаляем сами задачи проекта
      db.prepare(`DELETE FROM tasks WHERE project_id = ?`).run(pid);

      // 3) Удаляем проект
      const info = db.prepare(`DELETE FROM projects WHERE id = ?`).run(pid);
      return info.changes; // 0 — проекта не было
    });

    const changes = tx(id);
    if (changes === 0) return res.status(404).json({ error: 'Project not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /projects/:id failed', e);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;


