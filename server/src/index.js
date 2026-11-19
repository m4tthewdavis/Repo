import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { pool } from './db.js';

const app = createApp({ db: pool });

// In production, serve the built React app from client/dist.
const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile('index.html', { root: clientDist }));
}

const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
