# Production network topology

`docker-compose.prod.yml` is the Linux VPS topology. It assumes a host running Docker Engine and persistent Docker volumes under the host's managed Docker data root (the recommended VPS mount is `/var/lib/saasweave/docker`). No service uses a source-code bind mount.

## Exposure boundary

Only Caddy binds host ports: `80:8080` and `443:8443`. Caddy terminates TLS, redirects HTTP to HTTPS, proxies `/server/*` to the API server and `/uploads/*` to private MinIO, and proxies all other paths to the web service. The API, web service, worker, PostgreSQL, Redis, MinIO, imgproxy, runtime controller, Docker socket, and preview ports have no host-published ports.

## Docker networks

| Network | Members | Purpose | Public exposure |
| --- | --- | --- | --- |
| `app` | Caddy, web, server, imgproxy | Reverse proxy and application traffic | Caddy only, via host 80/443 |
| `data` | server, web SSR, worker, PostgreSQL, Redis, MinIO, imgproxy | Stateful services | none (`internal: true`) |
| `sandbox-control` | server, web SSR, runtime controller | Authenticated controller calls | none (`internal: true`) |
| `sandbox-preview-network` | controller-created sandbox containers | Isolated untrusted preview workloads | none (`internal: true`) |
| `sandbox-preview-gateway-network` | controller-created loopback preview gateways | Controller-managed preview mediation | loopback-only ephemeral gateway ports |

The runtime controller is the sole Docker-authorized process. `server`, `web`, and `worker` do not mount `docker.sock` and production images do not include a Docker CLI. Preview sandboxes are never joined directly to the application or control networks.

## Persistent state

Named volumes persist PostgreSQL, Redis AOF, MinIO assets, and Caddy ACME data. The operator must put Docker's data root on encrypted durable VPS storage (for example `/var/lib/saasweave/docker`) and include it in host backup monitoring. Docker volumes are not a replacement for the database and object-storage backup/restore procedure in [PRODUCTION-OPERATIONS.md](./PRODUCTION-OPERATIONS.md).

## Verification

Before a production deployment:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# edit values with a secrets manager; never put the file in Git
pnpm ops:production-env-validate .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
```

After deployment, verify only Caddy has published ports:

```bash
docker compose -f docker-compose.prod.yml ps
docker inspect saasweave-server --format '{{json .HostConfig.Binds}}'
```

The latter must not list `/var/run/docker.sock`.
