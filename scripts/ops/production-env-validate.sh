#!/usr/bin/env bash
# Validate a production environment file without sourcing or printing it.
set -euo pipefail
env_file="${1:-.env.production}"
[[ -r "$env_file" ]] || { echo "Production environment file is missing or unreadable: $env_file" >&2; exit 1; }
value_of() { sed -n -E "s/^[[:space:]]*${1}=([^[:space:]].*)$/\1/p" "$env_file" | tail -n 1 | sed -E "s/^[[:space:]]+|[[:space:]]+$//g; s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/"; }
require_value() { local value; value="$(value_of "$1")"; [[ -n "$value" && ! "$value" =~ ^(replace|changeme|example|TODO|<) ]] || { echo "Missing or placeholder production value: $1" >&2; return 1; }; }
for key in APP_DOMAIN ACME_EMAIL BETTER_AUTH_SECRET RUNTIME_CONTROLLER_TOKEN METRICS_BEARER_TOKEN PLATFORM_ADMIN_EMAILS DATABASE_URL REDIS_URL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB MINIO_ACCESS_KEY_ID MINIO_SECRET_ACCESS_KEY MINIO_PUBLIC_BASE_URL MEDIA_PUBLIC_BASE_URL VITE_IMGPROXY_URL VITE_SERVER_URL VITE_WEB_URL MAIL_PROVIDER MAIL_FROM SOURCE_COMMIT; do require_value "$key"; done
for key in VITE_SERVER_URL VITE_WEB_URL MINIO_PUBLIC_BASE_URL MEDIA_PUBLIC_BASE_URL VITE_IMGPROXY_URL; do value="$(value_of "$key")"; [[ "$value" =~ ^https:// && ! "$value" =~ (localhost|127\.0\.0\.1|host\.docker\.internal) ]] || { echo "Production URL must use HTTPS and must not point at a local development host: $key" >&2; exit 1; }; done
[[ ! "$(value_of APP_DOMAIN)" =~ [/:] ]] || { echo "APP_DOMAIN must be a bare DNS name" >&2; exit 1; }
[[ "$(value_of VITE_SERVER_URL)" == */server ]] || { echo "VITE_SERVER_URL must end with /server" >&2; exit 1; }
[[ "$(value_of ACME_EMAIL)" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo "ACME_EMAIL must be an email address" >&2; exit 1; }
for key in BETTER_AUTH_SECRET RUNTIME_CONTROLLER_TOKEN METRICS_BEARER_TOKEN POSTGRES_PASSWORD MINIO_SECRET_ACCESS_KEY; do value="$(value_of "$key")"; [[ ${#value} -ge 32 ]] || { echo "Production secret is too short: $key" >&2; exit 1; }; done
case "$(value_of MAIL_PROVIDER)" in
  resend) require_value RESEND_API_KEY ;;
  smtp) require_value SMTP_URL ;;
  *) echo "MAIL_PROVIDER must be resend or smtp" >&2; exit 1 ;;
esac
[[ "$(value_of NODE_ENV)" == "production" ]] || { echo "NODE_ENV must be production" >&2; exit 1; }
[[ "$(value_of REQUIRE_EMAIL_VERIFICATION)" != "false" ]] || { echo "REQUIRE_EMAIL_VERIFICATION must not be false in production" >&2; exit 1; }
echo "Production environment validation passed (${env_file})."
