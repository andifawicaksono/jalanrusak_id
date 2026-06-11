module.exports = {
  apps: [
    {
      name: 'jalanrusak-backend',
      cwd: '/root/apps/jalanrusak_id/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/apps/logs/backend-error.log',
      out_file:   '/apps/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'jalanrusak-frontend',
      cwd: '/root/apps/jalanrusak_id/frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/apps/logs/frontend-error.log',
      out_file:   '/apps/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
