// Integration tests against a real database. Point DATABASE_URL at a
// throwaway database: the tests truncate the tasks table.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';

let server;
let base;

const api = async (path, options = {}) => {
  const res = await fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

before(async () => {
  await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await pool.query('TRUNCATE tasks RESTART IDENTITY');
  server = createApp({ db: pool }).listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await pool.end();
});

test('creates, reads, updates and deletes a task', async () => {
  const created = await api('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: '  Write docs ', priority: 'high', due_date: '2030-01-15' }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Write docs');
  assert.equal(created.body.status, 'todo');
  assert.equal(created.body.due_date, '2030-01-15');

  const { id } = created.body;
  const fetched = await api(`/tasks/${id}`);
  assert.equal(fetched.body.priority, 'high');

  const updated = await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'done', due_date: null }) });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, 'done');
  assert.equal(updated.body.due_date, null);
  assert.equal(updated.body.title, 'Write docs');

  assert.equal((await api(`/tasks/${id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await api(`/tasks/${id}`)).status, 404);
});

test('filters by status and search text', async () => {
  await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'Buy milk', status: 'done' }) });
  await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'Call Sam', description: 'about milk' }) });

  const done = await api('/tasks?status=done');
  assert.deepEqual(done.body.map((t) => t.title), ['Buy milk']);

  const milk = await api('/tasks?q=MILK');
  assert.equal(milk.body.length, 2);
});

test('rejects invalid input', async () => {
  assert.equal((await api('/tasks', { method: 'POST', body: '{}' })).status, 400);
  assert.equal((await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'x', status: 'nope' }) })).status, 400);
  assert.equal((await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'x', due_date: 'tomorrow' }) })).status, 400);
  assert.equal((await api('/tasks', { method: 'POST', body: '{bad json' })).status, 400);
  assert.equal((await api('/tasks/abc')).status, 400);
  assert.equal((await api('/tasks/1', { method: 'PATCH', body: JSON.stringify({ bogus: 1 }) })).status, 400);
  assert.equal((await api('/tasks?status=nope')).status, 400);
  assert.equal((await api('/tasks/999999', { method: 'PATCH', body: JSON.stringify({ title: 'y' }) })).status, 404);
});
