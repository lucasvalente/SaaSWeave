# AUTUAX Production Security & Operations Runbook

**Document Version:** 1.0.0  
**Classification:** Restricted / Internal Engineering  
**Applicability:** Production VPS (`37.60.237.117`), Caddy Edge, Containers, Database & Redis.

---

## 1. Absolute Security Directives (Golden Rules)

1. **ZERO CLEARTEXT SECRETS IN COMMAND LINES**:
   - **PROHIBITED**: `redis-cli -a <secret>`, passing passwords in `curl` URLs, or plain strings in shell parameters.
   - Shell arguments are visible in `/proc`, `ps aux`, container logs, daemon inspection records, and shell histories.
   - **MANDATORY**: Always supply credentials via standard environment variables (e.g. `REDISCLI_AUTH`, `PGPASSWORD`) or temporary protected config files / stdin pipes.

2. **CENTRALIZED LOG REDACTION**:
   - All production telemetry must pass through `@autuax/observability` sanitization.
   - Never log connection strings (`redis://`, `postgresql://`), session cookies, auth tokens, CPF/CNH, or private keys.

3. **VOLUME & DATA IMMUTABILITY**:
   - Never run `docker compose down -v`.
   - Production persistent volumes (`postgres_prod_data`, `redis_prod_data`, `caddy_prod_data`) must never be purged during routine redeployments or secret rotations.

4. **HERMES GOVERNANCE**:
   - Every production modification must be pre-planned by Hermes and executed by Codex following strict verification steps.
   - Production gate is strictly `BLOCKED` if any P0 or P1 finding exists.

---

## 2. Safe Operational Procedures

### 2.1 Safe Redis Access (Zero Plaintext Exposure)

To interact with the Redis instance inside Docker without exposing credentials in the process table:

```bash
# RECOMMENDED: Utilize the container's pre-configured internal authentication
docker exec -it autuax-prod-redis redis-cli ping

# OR via ephemeral stdin / environment variable:
docker exec -e REDISCLI_AUTH="<secret>" autuax-prod-redis redis-cli ping
```

*Note: In `docker-compose.prod.yml`, the `redis` service injects `REDISCLI_AUTH: ${REDIS_PASSWORD}`, allowing `redis-cli ping` to authenticate automatically without the `-a` argument.*

---

### 2.2 Standard Secret Rotation Procedure (e.g., Redis)

When a secret must be rotated:

1. **Generate New Strong Secret**:
   Use a cryptographically secure generator (e.g., 32-byte hex token) without printing to standard output or terminal history:
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```

2. **Update Environment Files Atomically**:
   Update `.env.production` and `.env` on the host:
   ```bash
   sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${NEW_SECRET}/" /root/autuax/.env.production
   sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${NEW_SECRET}/" /root/autuax/.env
   ```

3. **Apply Configuration via Controlled Restart**:
   Restart the services that depend on the secret:
   ```bash
   cd /root/autuax
   docker compose -f docker-compose.prod.yml up -d --no-deps redis api worker
   ```

4. **Verify Invalidation of Old Secret**:
   Verify that an authentication attempt with the prior secret is explicitly rejected:
   ```bash
   # Must return (error) WRONGPASS invalid username-password pair
   docker run --rm --network autuax-prod_autuax_network -e REDISCLI_AUTH="<old-secret>" redis:7-alpine redis-cli -h redis ping
   ```

5. **Verify Health of Services with New Secret**:
   - Redis responds `PONG` to `docker exec autuax-prod-redis redis-cli ping`.
   - API connects cleanly: `curl -s https://app.zapdisparo.com/api/health/ready` returns `status: "ready"`.
   - Worker logs show `worker_redis_connected`.

---

### 2.3 Production Deployment Workflow

1. Validate local codebase:
   ```bash
   bun run typecheck
   bun run lint
   bun run test
   bun run build
   ```
2. Pull latest verified commit onto the host:
   ```bash
   cd /root/autuax
   git pull origin main
   ```
3. Rebuild and restart services safely:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Verify edge status and headers via Caddy:
   ```bash
   curl -I https://app.zapdisparo.com/
   curl -s https://app.zapdisparo.com/api/health/ready
   ```

---

### 2.4 Hermes Release Gate Protocol

Before closing any remediation or production milestone:
1. All automated tests must pass (`tsc PASS`, `biome PASS`, `vitest PASS`, `turbo build PASS`).
2. Edge firewall (UFW) must be active with only ports 22, 80, 443 permitted.
3. Database (5432), Cache (6379), and API (3333) ports must be strictly unexposed to the WAN.
4. SSR and client hydration must be verified via actual HTTP and browser rendering.
5. All specialist agent reviews must output `APPROVED`.
