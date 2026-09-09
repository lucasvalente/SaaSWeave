# Sandbox Preview V1

Status: COMPLETE — final local validation refreshed 2026-09-08

Final evidence (2026-09-08): the production application server uses only
`HttpRuntimeControllerClient`; the Docker socket and Docker CLI are absent
from that container. Snapshot files cross the authenticated controller
boundary as a bounded, path-validated payload and are materialized into an
isolated managed Docker volume. The real Chromium flow completed create,
install, build, dev, health, HMAC preview proxy (HTTP 200 with `Generated app`
content), restart, stop, and a second start.

Concurrency is protected by in-process single-flight plus a PostgreSQL
advisory lock. Expiry/reconciliation clears stale readiness and mappings.
Controller operations reject non-managed containers by mandatory labels;
the negative live check against PostgreSQL returned 404. Sandbox tests are
47/47, TypeScript and the monorepo build pass, and the production dependency
audit reports no known vulnerabilities.

Network policy continuation: lifecycle phases are explicit. INSTALL uses a
dedicated `sandbox-install-network` with public registry egress and no
attached platform services; PREPARE/BUILD/RUNTIME use `--network=none`.
The local Golden Template proof completed `pnpm install --frozen-lockfile`
and `pnpm build` with exit code 0. The install network is intentionally a
pragmatic isolated bridge for V1; domain allowlisting/proxy/cache remains
future hardening.

E2E bootstrap strategy: test-only identity/workspace setup reuses the existing
integration harness. Project creation and Golden Template snapshot creation
are performed through the real console project and Builder services; no
sandbox runtime state or preview readiness is fabricated.

Preview reachability uses the dedicated `sandbox-preview-network` runtime
boundary with an optional runtime-controlled loopback publication
(`127.0.0.1:hostPort:internalPort`). The gateway resolves this address
server-side; clients cannot select a port or upstream, and no platform
service is attached to the preview network. Runtime egress remains disabled
by policy; only the gateway path is intended.

Implemented locally: Docker runtime adapter with fixed structured arguments, network deny, read-only filesystem, non-root image, dropped capabilities, no-new-privileges, memory/CPU/PID limits, runtime ID validation, sandbox schema/migration, lifecycle API (list/create/inspect/start/stop/restart), HMAC preview gateway, controlled command gateway, and Builder Preview panel with safe unavailable state. Pinned image `saasweave-sandbox:1.0.0` is built locally and runs as non-root.

Completed in this continuation: snapshot materialization with traversal/draft rejection and bounded file limits; TTL metadata, expiry cleanup, runtime reconciliation, bounded output, pinned-image persistence, and public preview route revalidation. The route regression (HTTP 503) was caused by the production server image lacking Docker CLI/socket access; the image now includes docker.io and grants the non-root server process the socket's root group. Real Docker-backed public route E2E returns HTTP 200. Remaining: full real Docker security/dogfood, concurrency/idempotency hardening and final reviews.

Security boundary continuation: added the internal `sandbox-runtime` controller with Bearer-authenticated, narrow runtime inspection/port contracts. The server image and compose service no longer mount the Docker socket or require Docker CLI; only the controller mounts the socket on the private preview network. Controller health is green and server socket absence was verified after recreation. Full lifecycle migration through the remote adapter and the remaining browser/security/dogfood gates are still pending.

## Security E2E — Reopened (2026-09-08)

This gate was initially rerun against a controller-created sandbox, then
reopened by the arbitrary-egress probe documented below.
The initial probe found that the `server` and `sandbox-runtime` service aliases
were reachable from a preview sandbox because they shared
`sandbox-preview-network`. The topology was corrected: previews remain on
`sandbox-preview-network`, while the application server and privileged runtime
controller communicate only on the internal `sandbox-control-network`. The
preview gateway continues to use the controller-verified loopback publication
through `host.docker.internal`; it does not require membership of the preview
network.

Evidence after the correction:

- A real sandbox received `DENY`/timeout for `sandbox-runtime`, `server`,
  PostgreSQL, Redis, and `169.254.169.254` metadata; it has no Docker socket.
- The production server image has no Docker CLI and no Docker socket mount.
  The Docker socket is mounted only in `sandbox-runtime`.
- Controller-created containers run as UID 100 with a read-only root,
  `cap-drop=ALL`, `no-new-privileges`, 512 MiB / 1 CPU / 256 PID limits, a
  managed volume mounted only at `/workspace`, and tmpfs mounts at `/tmp` and
  `/home/sandbox`. `/workspace`, `/tmp`, and `/home/sandbox` are writable;
  `/etc`, `/usr`, and `/root` are denied.
- The controller returns 401 without its bearer credential and 404 for an
  authenticated request targeting a non-managed container.
- `pnpm exec vp test --run src/sandbox/__tests__` in `packages/api`: 11 files,
  61 tests passed.

The `/home/sandbox` tmpfs mount is explicitly owned by the non-root sandbox
UID (`uid=100,gid=100,mode=700`), fixing the E2E permission failure found in
this run. No server Docker authority, sandbox workspace policy, or lifecycle
logic was changed.

### Gate reopened — preview egress (2026-09-08)

The existing Docker network was a non-internal bridge, and a real preview
sandbox received HTTP 200 from an arbitrary public upstream. This is a HIGH
violation of the runtime no-egress contract. The compose definition now
declares `sandbox-preview-network` as an internal named network. The existing
network cannot be changed in place: it must be recreated after its currently
attached preview containers have been safely stopped and removed. Do not mark
This was a temporary reopening condition; the migration and a new
arbitrary-upstream probe are recorded as passing below.

### Final network enforcement (2026-09-08)

The preview network was recreated as an internal Docker network after safely
removing only its seven ephemeral preview containers. Docker Desktop does not
publish a container port directly from an internal network, so the controller
now creates a constrained, controller-owned HTTP/WebSocket gateway for each
preview. The sandbox itself stays exclusively on the internal network; the
gateway alone publishes a loopback port and proxies only to its paired sandbox.
The server remains outside both preview networks and retains no Docker
authority.

Live verification: a controller-created sandbox could not fetch an arbitrary
public upstream (`EGRESS_DENY`); its preview mapping was returned through the
managed gateway, and controller cleanup left zero managed preview containers.
This closes the egress finding without reintroducing a local-Docker fallback.
