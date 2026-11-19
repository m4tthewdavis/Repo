import pg from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates,
// so they don't shift with the server's time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://tasks:tasks@localhost:5432/tasks',
});
