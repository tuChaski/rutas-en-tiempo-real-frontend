#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

if [ ! -f .env ]; then
    printf '%s\n' 'Falta .env. Configura DOMAIN y CERTBOT_EMAIL.' >&2
    exit 1
fi

set -a
. ./.env
set +a

: "${DOMAIN:?Define DOMAIN en .env}"
: "${CERTBOT_EMAIL:?Define CERTBOT_EMAIL en .env}"

COMPOSE="docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml"
$COMPOSE run --rm certbot certonly --webroot --webroot-path /var/www/certbot \
    --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive \
    -d "$DOMAIN"

cat > deploy/nginx/ssl.conf <<EOF
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://realtime:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }

    location / {
        proxy_pass http://web-admin:4173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

$COMPOSE up -d nginx
$COMPOSE exec -T nginx nginx -t
$COMPOSE exec -T nginx nginx -s reload
