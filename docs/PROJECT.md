# Domingo às Dez App

The public website of domingoasdez.com, built with SvelteKit. It replaced the public frontend of the legacy Laravel site and shares that site's database. The legacy source is at `E:\Projetos\DomingoAsDez` on this machine and is the reference when porting any logic.

## Scope

This app is only the public site. These live elsewhere:

- **Admin / backoffice**: the admin app (`domingoasdez-admin`, `C:\Users\Tiago\Desktop\repos\domingoasdez-admin`, served at `ADMIN_BASE_URL`). Admin links on public pages point there.
- **Background processes** (cron jobs, emails such as the flash-interview mails, cleanups): still on Laravel, to be migrated in a separate project.

## Local environment

- **Node.js 26.12.1 or newer, everywhere (local and prod).** `.nvmrc` / `.node-version` pin it, `engines` + `engine-strict` in `.npmrc` make `npm install` refuse older versions, and the `init` hook in `src/hooks.server.ts` stops the server from starting on one. To raise the minimum, change `MIN_NODE_VERSION` in `src/lib/server/node-version.ts`, `engines.node` and both version files together (`node-version.spec.ts` fails if they differ).
- The legacy site runs in Docker at http://localhost:8000/. Run `docker ps` to see what's running.
- The local dev database is `host=localhost db=dad_db user=root password=rootpassword`.
  - It runs in the `local-mysql` container: `docker exec local-mysql mysql -uroot -prootpassword --default-character-set=utf8mb4 dad_db -e "…"`.
  - **You may change data in this local database, only to set up a test case you want to check in the UI.** For example: move a game's date, change a score, add votes or comments.
    - Only the local Docker database. Never any other database.
    - Data only. No schema changes (DDL), even locally. Real schema and data changes always go through migrations in domingoasdez-admin (see Database below).
    - Before changing anything, save the original values (select the rows first). After the test, put everything back as it was when possible: restore the old values and delete the rows you inserted. If something can't be restored, tell the user what's left.
    - Keep changes narrow: update or delete by primary key, never by broad conditions.
  - The app itself also writes rows through its normal flows (see Database below).

## Database

The app uses the same database and data model as the legacy site.

- **This app never changes the schema.** No `drizzle-kit push/generate/migrate` and no DDL. The schema is owned by domingoasdez-admin (`drizzle/migrations` in that repo). Laravel doesn't get migrations any more either.
- It does write rows: registration, profile, votes, score reports, flash interviews, info reports and partner clicks.
- `src/lib/server/db/schema.ts` mirrors only the tables and columns this app uses. After an admin migration: run `npm run db:pull` (output in `./drizzle`, git-ignored), port the columns this app needs, and deploy after the admin.
- Admin migrations are expand-then-contract: new columns are nullable or have a default, and a column is only dropped once no app reads it. Don't depend on a column the admin plans to drop, and tolerate columns this app doesn't know.
- Logins use the stored users and password hashes, so accounts work on both sites.

## Media

- Media files (images, videos) still live on the legacy site's filesystem and are served by its nginx. The legacy site keeps writing them; this app only reads them, except profile photos, which this app uploads to object storage.
- The database stores relative paths such as `/storage/images/image.png`. Before sending a media URL to the browser, the server prefixes it with the legacy origin from config (`MEDIA_BASE_URL`, or the CDN when `MEDIA_CDN_ENABLED` is on). Use `mediaUrl()` in `src/lib/server/media.ts`; never hard-code an origin.

## Product rules

- **Replicate the legacy logic** unless asked otherwise. Most server helpers are ports of a Laravel controller and say which one in their header comment.
- **Simple first, depth on demand.** The bottom tab bar has five tabs: Início, Jogos, Competições, Páginas and Conta. Everything else is reached from inside them: a club from a game or competition, a player from a club, and so on. Add complexity only when asked.
- **Translations.** pt-PT is the default, then en and fr. Every user-facing string is a Paraglide message, never hard-coded text.
- **Design.** Mobile first, light and dark mode, Apple Liquid Glass style, no top or side navigation, only two floating buttons at the top (back and theme). The details are in `docs/DESIGN_SYSTEM.md`.

## More documentation

- `docs/DESIGN_SYSTEM.md`: tokens, components and page patterns.
- `docs/README.md`: index of the per-page docs, plus the rules every page shares.
- `docs/known-gaps.md`: things the legacy site had, or the design asks for, that aren't built yet.
