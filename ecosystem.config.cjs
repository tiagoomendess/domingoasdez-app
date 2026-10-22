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
				NODE_ENV: 'production'
			}
		}
	]
};
