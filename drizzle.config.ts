import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// The schema is owned by domingoasdez-admin's migrations; this app never changes it. Its
// schema.ts mirrors the tables it uses. `npm run db:pull` introspects the database into
// ./drizzle (git-ignored) to compare after an admin migration. Never push, generate or migrate.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	tablesFilter: ['!migrations', '!__drizzle_migrations'],
	dialect: 'mysql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
