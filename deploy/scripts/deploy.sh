#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

if [ ! -f .env ]; then
    printf '%s\n' 'Falta .env. Crea el archivo a partir de .env.example y configura los secretos.' >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    printf '%s\n' 'Se requiere Docker con el plugin Docker Compose.' >&2
    exit 1
fi

if [ "${SKIP_GIT_PULL:-false}" != "true" ]; then
    git pull --ff-only origin "${DEPLOY_BRANCH:-main}"
fi

COMPOSE="docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml"
$COMPOSE config --quiet
$COMPOSE up -d --build --remove-orphans
$COMPOSE ps
