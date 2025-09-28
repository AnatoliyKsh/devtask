const express = require('express');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, color='#10b981' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const id = nanoid();
    db.prepare('INSERT INTO tags(id, name, color) VALUES (?, ?, ?)').run(id, name, color);
    res.status(201).json({ id, name, color });
  } catch (e) {
    res.status(400).json({ error: 'tag already exists?' });
  }
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tags WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const { name=row.name, color=row.color } = req.body;
  db.prepare('UPDATE tags SET name=?, color=? WHERE id=?').run(name, color, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
