#!/bin/bash
# WMS Production Setup — run as root or user with sudo
# Usage: chmod +x setup.sh && ./setup.sh

set -e

APP_DIR="/var/www/html/javascript/wms"
DOMAIN="wms.otakweb.com"  # Ganti dengan domain/VPS IP

echo "=== WMS Production Setup ==="

# 1. Install Bun (optional — needed for dev server, production can use Node.js + tsx)
if ! command -v bun &>/dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 2. Install PM2
if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# 3. Install dependencies & build
cd "$APP_DIR"
cp .env.example .env
echo "==> Edit .env with real DATABASE_URL + JWT secrets, then re-run this script"
read -p "Press Enter after editing .env..."

npm install
npm run db:migrate
npm run db:seed
npm run build

# 4. PM2 — use Bun if available, otherwise Node.js + tsx
pm2 delete wms-api wms-api-node 2>/dev/null || true
if command -v bun &>/dev/null; then
    pm2 start ecosystem.config.js --only wms-api
else
    echo "Bun not found, using Node.js + tsx fallback"
    npm install -w apps/api
    pm2 start ecosystem.config.js --only wms-api-node
fi
pm2 save
pm2 startup systemd -u "$(whoami)" --hp "$HOME"

# 5. Nginx
echo "=== Nginx Setup ==="
sudo cp nginx.conf /etc/nginx/sites-available/wms
sudo sed -i "s/wms.otakweb.com/$DOMAIN/g" /etc/nginx/sites-available/wms
sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/

# 6. Certbot (SSL/HTTPS)
echo "=== SSL Setup ==="
if ! command -v certbot &>/dev/null; then
    echo "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi
echo "Requesting SSL certificate..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect

sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Done ==="
echo "App: https://$DOMAIN"
echo "API: https://$DOMAIN/api/v1/health"
echo ""
echo "Login: admin@toko.com / admin123"
