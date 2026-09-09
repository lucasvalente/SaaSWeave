#!/usr/bin/env bash
# Local/CI recovery drill. It restarts critical Compose services and proves a DB marker survives.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$root"
[[ -f .env.docker ]] || { echo "Missing .env.docker" >&2; exit 1; }

pnpm dotenvx run -f .env.docker -- bash -c '
set -euo pipefail
compose() { docker compose "$@"; }
db="${POSTGRES_DB:-saasweave}"; user="${POSTGRES_USER:-postgres}"; password="${POSTGRES_PASSWORD:-changeme}"
marker="recovery-drill-$(date +%s)"
cleanup() { compose exec -T -e PGPASSWORD="$password" postgres psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -c "DELETE FROM audit_log WHERE id = '\''$marker'\'';" >/dev/null 2>&1 || true; }
trap cleanup EXIT

compose exec -T postgres pg_isready -U "$user" -d "$db" >/dev/null
compose exec -T -e PGPASSWORD="$password" postgres psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -c "INSERT INTO audit_log (id, action, actor_name, created_at) VALUES ('\''$marker'\'', '\''ops.restart_recovery.marker'\'', '\''recovery-drill'\'', NOW());" >/dev/null

echo "Restarting critical local services…"
compose restart server sandbox-runtime redis postgres
deadline=$((SECONDS + 180))
for container in saasweave-postgres saasweave-redis saasweave-server saasweave-sandbox-runtime; do
  while true; do
    status="$(docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" "$container")"
    [[ "$status" == healthy || ( "$container" == saasweave-sandbox-runtime && "$status" == running ) ]] && break
    (( SECONDS < deadline )) || { echo "Recovery timeout: $container ($status)" >&2; exit 1; }
    sleep 3
  done
done

count="$(compose exec -T -e PGPASSWORD="$password" postgres psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -At -c "SELECT COUNT(*) FROM audit_log WHERE id = '\''$marker'\'';" | tr -d "\r")"
[[ "$count" == 1 ]] || { echo "Persistence failed after restart (marker count=$count)" >&2; exit 1; }
echo "Restart/recovery drill passed."
'
