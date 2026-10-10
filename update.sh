#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> docker compose build"
docker compose --env-file .env.docker build

# The backend entrypoint runs `migrate` on every boot, so there is nothing to
# wait for or migrate here.
echo "==> docker compose up -d"
docker compose --env-file .env.docker up -d

echo "==> done"
docker compose --env-file .env.docker ps
