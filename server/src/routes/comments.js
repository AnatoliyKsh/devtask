const express = require('express');
const { nanoid } = require('nanoid');
const { db } = require('../db');
const router = express.Router();

router.post('/:taskId', (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  const id = nanoid();
  db.prepare('INSERT INTO comments(id, task_id, body) VALUES(?, ?, ?)').run(id, req.params.taskId, body);
  res.status(201).json({ id, body });
});

router.delete('/:commentId', (req, res) => {
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.commentId);
  res.json({ ok: true });
});

module.exports = router;
