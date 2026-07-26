// PM2 Ecosystem for WMS API
// Supports both Bun (preferred) and Node.js + tsx (fallback)
//
// Usage:
//   # With Bun:
//   pm2 start ecosystem.config.js
//
//   # With Node.js (if Bun not available):
//   pm2 start ecosystem.config.js --only wms-api-node
//
//   pm2 save
//   pm2 startup

module.exports = {
  apps: [
    {
      // Bun runtime (preferred — faster, native TS)
      name: 'wms-api',
      script: 'apps/api/src/index.ts',
      interpreter: 'bun',
      cwd: '/var/www/html/javascript/wms',
      env: {
        NODE_ENV: 'production',
        PORT: 3034,
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
    {
      // Node.js fallback (tsx)
      name: 'wms-api-node',
      script: './node_modules/.bin/tsx',
      args: 'apps/api/src/index.ts',
      cwd: '/var/www/html/javascript/wms',
      env: {
        NODE_ENV: 'production',
        PORT: 3034,
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
