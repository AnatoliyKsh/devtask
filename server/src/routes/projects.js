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

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
