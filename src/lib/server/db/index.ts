import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// dateStrings: true keeps Laravel's naive DATETIME/TIMESTAMP values as strings
// (no JS Date timezone shift). The legacy app timezone is UTC.
const client = mysql.createPool({
	uri: DATABASE_URL,
	dateStrings: true
});

export const db = drizzle(client, { schema, mode: 'default' });
