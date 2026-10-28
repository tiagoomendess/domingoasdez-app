// PM2 process file. Deploys go through scripts/deploy.sh (build into build.next, swap,
// `pm2 startOrReload ecosystem.config.cjs`). Runtime settings (PORT, ORIGIN, …) live in .env.
module.exports = {
	apps: [
		{
			name: 'domingoasdez-app',
			script: './build/index.js',
			cwd: __dirname,
			node_args: '--env-file=.env',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			max_memory_restart: '512M',
			env: {
				NODE_ENV: 'production',
				// JSON lines for Grafana Alloy (docs/logging.md in domingoasdez-admin). Set here, it wins over .env.
				LOG_FORMAT: 'json',
				// adapter-node refuses bodies over 512 KB by default. Placard ads are uploaded as is
				// (up to 1 MB, docs/pages/competicoes/clube-placard.md) and backgrounds as 1920×1080 JPEGs.
				BODY_SIZE_LIMIT: '4M'
			}
		}
	]
};
