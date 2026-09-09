#!/usr/bin/env bash
# Roll back application images only. Database migrations are intentionally never reversed.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$root"
compose_file="${PRODUCTION_COMPOSE_FILE:-docker-compose.prod.yml}"; env_file="${PRODUCTION_ENV_FILE:-.env.production}"; rollback_tag="${ROLLBACK_IMAGE_TAG:-}"; dry_run=false
[[ "${1:-}" != "--dry-run" ]] || dry_run=true
[[ -n "$rollback_tag" && "$rollback_tag" != latest ]] || { echo "ROLLBACK_IMAGE_TAG must be an immutable image tag or digest" >&2; exit 1; }
[[ -f "$compose_file" ]] || { echo "Production compose file not found: $compose_file" >&2; exit 1; }
run() { if "$dry_run"; then printf '+ '; printf '%q ' "$@"; printf '\n'; else "$@"; fi; }
run bash scripts/ops/production-env-validate.sh "$env_file"
run env IMAGE_TAG="$rollback_tag" docker compose --env-file "$env_file" -f "$compose_file" config --quiet
run env IMAGE_TAG="$rollback_tag" docker compose --env-file "$env_file" -f "$compose_file" pull server web worker sandbox-runtime
run env IMAGE_TAG="$rollback_tag" docker compose --env-file "$env_file" -f "$compose_file" up -d --no-build server web worker sandbox-runtime
if "$dry_run"; then echo "Dry run passed: no containers were changed."; exit 0; fi
echo "Rollback containers started. Run deploy-production.sh health gates and monitor 5xx rate for 30 minutes."
