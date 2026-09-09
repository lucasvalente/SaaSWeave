#!/usr/bin/env bash
# Reproducible production deployment: validate -> migrate -> up -> health gate.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$root"
compose_file="${PRODUCTION_COMPOSE_FILE:-docker-compose.prod.yml}"; env_file="${PRODUCTION_ENV_FILE:-.env.production}"; dry_run=false
[[ "${1:-}" != "--dry-run" ]] || dry_run=true
[[ -f "$compose_file" ]] || { echo "Production compose file not found: $compose_file" >&2; exit 1; }
[[ "$env_file" != ".env.docker" ]] || { echo "Refusing the local .env.docker for production deployment" >&2; exit 1; }
run() { if "$dry_run"; then printf '+ '; printf '%q ' "$@"; printf '\n'; else "$@"; fi; }
run bash scripts/ops/production-env-validate.sh "$env_file"
run docker compose --env-file "$env_file" -f "$compose_file" config --quiet
# Migrations are a single explicit release step; the migrator owns DB advisory locking.
run docker compose --env-file "$env_file" -f "$compose_file" run --rm migrate
run docker compose --env-file "$env_file" -f "$compose_file" up -d --build --remove-orphans
if "$dry_run"; then echo "Dry run passed: no containers were changed."; exit 0; fi
deadline=$((SECONDS + ${PRODUCTION_HEALTH_TIMEOUT_SECONDS:-180}))
for service in server web worker sandbox-runtime; do
  id="$(docker compose --env-file "$env_file" -f "$compose_file" ps -q "$service")"; [[ -n "$id" ]] || { echo "Service did not start: $service" >&2; exit 1; }
  while true; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")"
    if [[ "$status" == healthy || ( "$status" == running && "$service" == sandbox-runtime ) ]]; then break; fi
    if (( SECONDS >= deadline )); then echo "Health gate timed out for $service (last=${status})" >&2; docker compose --env-file "$env_file" -f "$compose_file" logs --tail=100 "$service" >&2 || true; exit 1; fi
    sleep 3
  done
done
echo "Production deployment health gates passed."
