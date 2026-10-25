# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@1.0.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:auto" drizzle="database:mysql+mysql:mysql2+docker:no" ai-tools="ide:claude-code,cursor+delivery:plugin+tools:mcp,svelte-code-writer,svelte-core-bestpractices,svelte-file-editor+mcpSetup:local" --install npm domingoasdez-app
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Deployment

Node + PM2 behind nginx (and Cloudflare), same setup as `domingoasdez-admin`. On the server, from
the repository and as the user that owns the PM2 process:

```sh
scripts/deploy.sh
```

It pulls `master` (fast-forward only; it stops if tracked files were changed on the server), runs
`npm ci` when `package-lock.json` or the Node version changed, and builds into `build.next` while
the current build keeps serving. Then it swaps the build in (the old one stays as `build.prev`),
reloads PM2 ([ecosystem.config.cjs](ecosystem.config.cjs)) and checks `/healthz`. `--help` lists
the options: `--force` (redeploy without new commits, e.g. after a failure) and `--rollback`
(serve `build.prev` again).

There are no migrations here: the schema belongs to `domingoasdez-admin`. When a release reads
new columns, deploy the admin first.

First deploy only: clone the repository, create `.env` (see `.env.example`: `PORT=3003`, `ORIGIN`,
`PROTOCOL_HEADER`, `ADDRESS_HEADER=CF-Connecting-IP`), run `scripts/deploy.sh --force`, then
`pm2 save` (and `pm2 startup` once per server) so the process comes back after a reboot. The nginx
site is [nginx.conf](nginx.conf). `GET /healthz` checks the app and the database for uptime
monitoring.

Logs: one JSON object per line in production (`LOG_FORMAT=json` in `ecosystem.config.cjs`),
a line per request (`src/lib/server/request-log.ts`) and the request id and user on every entry.
Server code logs through `logger.child('<module>')` from `#lib/server/log.ts`, not `console.*`.
Grafana Alloy sends them to Grafana Cloud with the admin's, nginx's and the legacy site's logs:
setup, queries and alerts in `docs/logging.md` of `domingoasdez-admin`.
