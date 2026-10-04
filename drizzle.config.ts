import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// WARNING: This app shares the legacy Laravel database. Schema here is for
// type-safe reads only. Never run `db:push` or `db:generate` against it.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'mysql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
