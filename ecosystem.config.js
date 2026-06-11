module.exports = {
  apps: [
    {
      name: 'jalanrusak-backend',
      cwd: '/apps/jalanrusak_id/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/apps/logs/backend-error.log',
      out_file:   '/apps/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'jalanrusak-frontend',
      cwd: '/apps/jalanrusak_id/frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/apps/logs/logs/frontend-error.log',
      out_file:   '/apps/logs/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
