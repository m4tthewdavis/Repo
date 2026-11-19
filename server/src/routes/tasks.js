import { Router } from 'express';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const COLUMNS = 'id, title, description, status, priority, due_date, created_at, updated_at';

/**
 * Validate a request body. With partial=true (PATCH) only the fields present are checked.
 * Returns { values } or { error }.
 */
function validate(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object' };
  const values = {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) return { error: 'title is required' };
    if (body.title.trim().length > 200) return { error: 'title must be 200 characters or fewer' };
    values.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') return { error: 'description must be a string' };
    values.description = body.description;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: `status must be one of ${STATUSES.join(', ')}` };
    values.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: `priority must be one of ${PRIORITIES.join(', ')}` };
    values.priority = body.priority;
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') {
      values.due_date = null;
    } else if (typeof body.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
      || Number.isNaN(Date.parse(body.due_date))) {
      return { error: 'due_date must be a YYYY-MM-DD date or null' };
    } else {
      values.due_date = body.due_date;
    }
  }
  if (partial && Object.keys(values).length === 0) return { error: 'No valid fields to update' };
  return { values };
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export function tasksRouter(db) {
  const router = Router();

  // GET /api/tasks?status=todo&q=search
  router.get('/', async (req, res) => {
    const where = [];
    const params = [];
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) return res.status(400).json({ error: 'Invalid status filter' });
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      params.push(`%${req.query.q.trim()}%`);
      where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM tasks
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY status = 'done', due_date NULLS LAST,
                array_position(ARRAY['high','medium','low']::task_priority[], priority), id`,
      params,
    );
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const { values, error } = validate(req.body);
    if (error) return res.status(400).json({ error });
    const keys = Object.keys(values);
    const { rows } = await db.query(
      `INSERT INTO tasks (${keys.join(', ')})
       VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING ${COLUMNS}`,
      keys.map((k) => values[k]),
    );
    res.status(201).json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { values, error } = validate(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    // Keys come from validate(), never from user input, so interpolating them is safe.
    const keys = Object.keys(values);
    const { rows } = await db.query(
      `UPDATE tasks SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}
       WHERE id = $${keys.length + 1}
       RETURNING ${COLUMNS}`,
      [...keys.map((k) => values[k]), id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  });

  return router;
}
