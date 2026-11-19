import express from 'express';
import cors from 'cors';
import { tasksRouter } from './routes/tasks.js';

export function createApp({ db }) {
  const app = express();

  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors(origins?.length ? { origin: origins } : undefined));
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api/tasks', tasksRouter(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Express 5 forwards rejected promises from async handlers here.
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
