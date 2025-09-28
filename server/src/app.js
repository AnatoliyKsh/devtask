/* DevFlow Server - Express + SQLite (better-sqlite3)
 * Minimal, clean, and extensible API.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { db, migrate } = require('./db');

const tasksRouter = require('./routes/tasks');
const projectsRouter = require('./routes/projects');
const tagsRouter = require('./routes/tags');
const commentsRouter = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// DB migrations / seed
migrate();

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/comments', commentsRouter);

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Serve client build in production if available
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[DevFlow] Server running on http://localhost:${PORT}`);
});
