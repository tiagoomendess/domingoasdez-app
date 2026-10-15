import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// dateStrings: true keeps Laravel's naive DATETIME/TIMESTAMP values as strings
// (no JS Date timezone shift). The legacy app timezone is UTC.
const createPool = () =>
	mysql.createPool({
		uri: DATABASE_URL,
		dateStrings: true,
		connectionLimit: 10,
		// mysql2 only reaps idle connections when maxIdle < connectionLimit. With the reaper on,
		// a connection idle for idleTimeout is closed, so a pool nobody uses (one orphaned by a
		// dev reload, or a quiet server) gives its connections back to MySQL within a minute.
		maxIdle: 5,
		idleTimeout: 60_000
	});

// Vite re-runs this module on every server-side reload in dev. Reuse the pool across reloads:
// a new pool each time leaks the old one's open connections until MySQL refuses new ones.
const shared = globalThis as typeof globalThis & { __dadAppPool?: mysql.Pool };
const client = (shared.__dadAppPool ??= createPool());

export const db = drizzle(client, { schema, mode: 'default' });
