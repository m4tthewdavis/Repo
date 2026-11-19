import { pool } from '../src/db.js';

const tasks = [
  ['Set up the database', 'Run docker compose up and npm run db:init.', 'done', 'high', null],
  ['Build the task list UI', 'React components for listing, filtering and editing tasks.', 'in_progress', 'medium', 3],
  ['Write API tests', 'Cover the CRUD endpoints with node:test.', 'todo', 'medium', 7],
  ['Deploy', 'Pick a host for the API, the client and Postgres.', 'todo', 'low', 14],
];

try {
  await pool.query('TRUNCATE tasks RESTART IDENTITY');
  for (const [title, description, status, priority, dueInDays] of tasks) {
    await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date)
       VALUES ($1, $2, $3, $4, CASE WHEN $5::int IS NULL THEN NULL ELSE current_date + $5::int END)`,
      [title, description, status, priority, dueInDays],
    );
  }
  console.log(`Seeded ${tasks.length} tasks.`);
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
