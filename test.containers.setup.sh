docker compose -f tests/docker-compose.yaml --env-file tests/.env down -v --remove-orphans || true
docker compose -f tests/docker-compose.yaml --env-file tests/.env up -d --build