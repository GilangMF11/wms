// PM2 Ecosystem for WMS API
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [
    {
      name: 'wms-api',
      script: 'apps/api/src/index.ts',
      interpreter: 'bun',
      cwd: '/var/www/html/javascript/wms',
      env: {
        NODE_ENV: 'production',
        PORT: 3034,
        // DATABASE_URL and JWT secrets loaded from .env via db/index.ts
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
