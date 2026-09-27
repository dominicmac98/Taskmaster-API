'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.DEMO_AUTH_ENABLED = 'true';
const { app, Task } = require('./src/server');
let server;
let base;
before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
async function login(user = 'alice') {
  const r = await fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user })
  });
  assert.equal(r.status, 200);
  return (await r.json()).token;
}
test('security headers also cover redirects, errors and missing routes', async () => {
  for (const route of ['/', '/health', '/robots.txt', '/sitemap.xml', '/tasks']) {
    const r = await fetch(base + route, { redirect: 'manual' });
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  }
});
test('invalid tokens and malformed login input are rejected', async () => {
  assert.equal((await fetch(base + '/tasks', { headers: { Authorization: 'Bearer invalid' } })).status, 401);
  const r = await fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"user":{}}'
  });
  assert.equal(r.status, 400);
});
test('demo login is disabled unless explicitly enabled', async () => {
  process.env.DEMO_AUTH_ENABLED = 'false';
  try {
    assert.equal((await fetch(base + '/login', { method: 'POST' })).status, 404);
  } finally {
    process.env.DEMO_AUTH_ENABLED = 'true';
  }
});
test('task owner comes from the verified token, not the submitted body', async t => {
  const token = await login();
  let captured;
  t.mock.method(Task, 'create', async value => { captured = value; return value; });
  const r = await fetch(base + '/tasks', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ title: 'Lab task', owner: 'victim', admin: true })
  });
  assert.equal(r.status, 201);
  assert.equal(captured.owner, 'alice');
  assert.equal(Object.hasOwn(captured, 'admin'), false);
});
test('reminders verify task ownership before contacting the worker', async t => {
  const token = await login();
  let query;
  t.mock.method(Task, 'findOne', async value => { query = value; return null; });
  const r = await fetch(base + '/tasks/0123456789abcdef01234567/remind', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token }
  });
  assert.equal(r.status, 404);
  assert.equal(query.owner, 'alice');
});
