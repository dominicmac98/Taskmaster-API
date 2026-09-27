'use strict';

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}
const WORKER_URL = process.env.WORKER_URL || 'http://worker:5000';
const app = express();
app.disable('x-powered-by');
app.disable('etag');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'",
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
  });
  next();
});
app.use(express.json({ limit: '16kb' }));

const Task = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  owner: { type: String, required: true, index: true },
  due: Date,
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  done: { type: Boolean, default: false }
}));

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET, { algorithms: ['HS256'] });
    if (typeof req.user.sub !== 'string') throw new Error('Invalid subject');
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

app.get('/', (req, res) => res.redirect('/health'));
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/login', (req, res) => {
  // Enable this demonstration login only in the isolated practice lab.
  // Production needs a real identity provider and password/MFA checks.
  if (process.env.DEMO_AUTH_ENABLED !== 'true') return res.sendStatus(404);
  const user = req.body?.user;
  if (typeof user !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(user)) {
    return res.status(400).json({ error: 'invalid user' });
  }
  res.json({ token: jwt.sign({ sub: user }, SECRET, { algorithm: 'HS256', expiresIn: '15m' }) });
});

app.get('/tasks', auth, async (req, res) => {
  res.json(await Task.find({ owner: req.user.sub }).lean());
});

app.post('/tasks', auth, async (req, res) => {
  const body = req.body;
  if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) {
    return res.status(400).json({ error: 'title must contain 1 to 200 characters' });
  }
  // Allowlisted fields replace the deep merge. The token determines owner.
  const task = await Task.create({
    title: body.title.trim(), owner: req.user.sub,
    due: body.due, meta: body.meta, done: body.done === true
  });
  res.status(201).json(task);
});

app.post('/tasks/:id/remind', auth, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ error: 'invalid task id' });
  }
  const task = await Task.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!task) return res.status(404).json({ error: 'task not found' });
  try {
    const response = await fetch(new URL('/jobs', WORKER_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: String(task._id), user: req.user.sub }),
      signal: AbortSignal.timeout(6000), redirect: 'error'
    });
    if (!response.ok) throw new Error('Worker rejected reminder');
    res.json(await response.json());
  } catch {
    res.status(502).json({ error: 'reminder service unavailable' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, req, res, next) => {
  const badInput = err.name === 'ValidationError' || err.type === 'entity.parse.failed';
  const status = err.status === 413 ? 413 : badInput ? 400 : 500;
  res.status(status).json({ error: status === 500 ? 'internal server error' : 'invalid request' });
});

async function start() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://mongo:27017/taskmaster', {
    serverSelectionTimeoutMS: 30000
  });
  const server = app.listen(process.env.PORT || 3000, () => console.log('TaskMaster API ready'));
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
if (require.main === module) start().catch(() => {
  console.error('Database connection failed');
  process.exit(1);
});
module.exports = { app, Task };
