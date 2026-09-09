import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const exec = promisify(execFile);
const token = process.env.RUNTIME_CONTROLLER_TOKEN ?? "";
const image = process.env.SANDBOX_IMAGE ?? "saasweave-sandbox:1.0.3";
const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
const docker = async (args) => (await exec("docker", args, { maxBuffer: 262_144 })).stdout.trim();
const send = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};
const idOk = (id) => /^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id);
const filePathOk = (value) => typeof value === "string" && value.length > 0 && value.length <= 240 && !value.startsWith("/") && !value.includes("\\") && value.split("/").every((part) => part && part !== "." && part !== "..");
// The gateway is controller-owned, accepts only HTTP/WebSocket traffic and is
// the sole bridge from the loopback-published host port to an internal sandbox.
const previewGatewayProgram = "const h=require('http'),n=require('net'),t=process.env.PREVIEW_TARGET,p=(q,s)=>{let u=h.request({hostname:t,port:4173,path:q.url,method:q.method,headers:q.headers},r=>{s.writeHead(r.statusCode||502,r.headers);r.pipe(s)});u.on('error',()=>{if(!s.headersSent)s.writeHead(502);s.end()});q.pipe(u)};let x=h.createServer(p);x.on('upgrade',(q,s,b)=>{let u=n.connect(4173,t,()=>{u.write(q.method+' '+q.url+' HTTP/'+q.httpVersion+'\\r\\n');for(let[k,v]of Object.entries(q.headers))u.write(k+': '+v+'\\r\\n');u.write('\\r\\n');if(b.length)u.write(b);s.pipe(u);u.pipe(s)});u.on('error',()=>s.destroy())});x.listen(4173,'0.0.0.0')";

async function readJson(request) {
  let body = "";
  let bytes = 0;
  for await (const chunk of request) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_JSON_BODY_BYTES) throw new Error("REQUEST_BODY_TOO_LARGE");
    body += chunk;
  }
  return JSON.parse(body || "{}");
}

async function requireManagedPreviewRuntime(id) {
  const labels = await docker([
    "inspect",
    "--format",
    "{{ index .Config.Labels \"saasweave.managed\" }}|{{ index .Config.Labels \"saasweave.kind\" }}",
    "--",
    id
  ]);
  if (labels !== "true|preview") throw new Error("RUNTIME_NOT_MANAGED");
}

async function previewGatewayId(runtimeId) {
  const output = await docker(["ps", "-aq", "--filter", "label=saasweave.managed=true", "--filter", "label=saasweave.kind=preview-gateway", "--filter", `label=saasweave.gateway-for=${runtimeId}`]);
  return output.split("\n").find(idOk) ?? null;
}

const server = createServer(async (request, response) => {
  if (request.url === "/health") return send(response, 200, { status: "ok" });
  if (!token || request.headers.authorization !== `Bearer ${token}`) return send(response, 401, { error: "UNAUTHORIZED" });

  try {
    // This is intentionally an inventory, not a general Docker listing: the
    // controller returns only IDs and normalized state for its own previews.
    if (request.method === "GET" && request.url === "/v1/runtimes") {
      const output = await docker([
        "ps", "-a",
        "--filter", "label=saasweave.managed=true",
        "--filter", "label=saasweave.kind=preview",
        "--format", "{{.ID}}|{{.State}}"
      ]);
      const runtimes = output.split("\n").filter(Boolean).flatMap((line) => {
        const [id, state] = line.split("|");
        if (!idOk(id)) return [];
        return [{ id, status: state === "running" ? "running" : "stopped" }];
      });
      return send(response, 200, runtimes);
    }

    if (request.method === "POST" && request.url === "/v1/runtimes") {
      const { files, publicEnv } = await readJson(request);
      if (!Array.isArray(files) || files.length === 0 || files.length > 256 || files.some((file) => !filePathOk(file?.path) || typeof file?.content !== "string" || file.content.length > 700_000)) return send(response, 400, { error: "INVALID_WORKSPACE" });
      if (publicEnv !== undefined && (!publicEnv || typeof publicEnv !== "object" || Object.keys(publicEnv).some((key) => key !== "VITE_SUPABASE_URL" && key !== "VITE_SUPABASE_ANON_KEY") || Object.values(publicEnv).some((value) => typeof value !== "string" || value.length > 4096))) return send(response, 400, { error: "INVALID_PUBLIC_ENV" });
      const suffix = randomUUID();
      const volume = `saasweave-preview-workspace-${suffix}`;
      const staging = await mkdtemp(join(tmpdir(), "saasweave-upload-"));
      let id;
      let gateway;
      try {
        for (const file of files) {
          const destination = join(staging, ...file.path.split("/"));
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, Buffer.from(file.content, "base64"));
        }
        await docker(["volume", "create", "--label", "saasweave.managed=true", "--label", "saasweave.kind=preview-workspace", volume]);
        id = await docker([
        "run", "-d", "--name", `saasweave-preview-${suffix}`,
        "--label", "saasweave.managed=true", "--label", "saasweave.kind=preview",
        "--label", `saasweave.workspace-volume=${volume}`,
        "--network=sandbox-preview-network",
        "--mount", `type=volume,source=${volume},target=/workspace`,
        "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--memory=512m", "--cpus=1", "--pids-limit=256",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=64m", "--tmpfs=/home/sandbox:rw,noexec,nosuid,size=64m,uid=100,gid=100,mode=700",
        "--env=HOME=/tmp", ...Object.entries(publicEnv ?? {}).flatMap(([key, value]) => ["--env", `${key}=${value}`]), "--entrypoint=node", "--", image, "-e", "setInterval(()=>{},2147483647)"
      ]);
        await docker(["cp", `${staging}/.`, `${id}:/workspace`]);
        gateway = await docker([
          "run", "-d", "--name", `saasweave-preview-gateway-${suffix}`,
          "--label", "saasweave.managed=true", "--label", "saasweave.kind=preview-gateway",
          "--label", `saasweave.gateway-for=${id}`,
          "--network=sandbox-preview-gateway-network", "--publish=127.0.0.1::4173",
          "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
          "--memory=64m", "--cpus=0.25", "--pids-limit=64",
          "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
          "--env", `PREVIEW_TARGET=saasweave-preview-${suffix}`,
          "--entrypoint=node", "--", image, "-e", previewGatewayProgram
        ]);
        await docker(["network", "connect", "sandbox-preview-network", gateway]);
      } catch (error) {
        if (gateway) await docker(["rm", "-f", gateway]).catch(() => undefined);
        if (id) await docker(["rm", "-f", id]).catch(() => undefined);
        await docker(["volume", "rm", "-f", volume]).catch(() => undefined);
        throw error;
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
      return send(response, 200, { id, status: "running" });
    }

    const action = request.url?.match(/^\/v1\/runtimes\/([^/]+)\/(start|stop|restart|install|build|dev)$/);
    if (request.method === "POST" && action && idOk(action[1])) {
      const [, id, operation] = action;
      await requireManagedPreviewRuntime(id);
      if (operation === "stop") {
        const gateway = await previewGatewayId(id);
        if (gateway) await docker(["rm", "-f", "--", gateway]).catch(() => undefined);
        const volume = await docker(["inspect", "--format", "{{ index .Config.Labels \"saasweave.workspace-volume\" }}", id]);
        await docker(["rm", "-f", "--", id]).catch(() => undefined);
        if (volume.startsWith("saasweave-preview-workspace-")) await docker(["volume", "rm", "-f", volume]).catch(() => undefined);
        return send(response, 200, { id, status: "stopped" });
      }
      if (operation === "start" || operation === "restart") {
        await docker([operation, "--", id]);
        return send(response, 200, { id, status: "running" });
      }
      const command = operation === "install"
        ? ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"]
        : operation === "build" ? ["pnpm", "run", "build"] : ["node", "server.mjs"];
      let stdout = "";
      try {
        stdout = await docker(["exec", ...(operation === "dev" ? ["-d"] : []), "-w", "/workspace", id, ...command]);
      } catch (error) {
        if (operation === "dev") throw error;
        const failure = error && typeof error === "object" ? error : {};
        return send(response, 200, {
          exitCode: Number.isInteger(failure.code) ? failure.code : 1,
          stdout: typeof failure.stdout === "string" ? failure.stdout : "",
          stderr: typeof failure.stderr === "string" ? failure.stderr : "",
          timedOut: false
        });
      }
      return send(response, 200, operation === "dev"
        ? { id, status: "running" }
        : { exitCode: 0, stdout, stderr: "", timedOut: false });
    }

    const inspection = request.url?.match(/^\/v1\/runtimes\/([^/]+)(?:\/ports\/(\d+))?$/);
    if (!inspection || !idOk(inspection[1])) return send(response, 404, { error: "NOT_FOUND" });
    const [, id, port] = inspection;
    await requireManagedPreviewRuntime(id);
    if (port) {
      if (port !== "4173") return send(response, 400, { error: "PORT_NOT_ALLOWED" });
      const gateway = await previewGatewayId(id);
      if (!gateway) return send(response, 404, { error: "MAPPING_NOT_FOUND" });
      const output = await docker(["port", gateway, "4173/tcp"]);
      const mapping = output.match(/127\.0\.0\.1:(\d+)/);
      return mapping
        ? send(response, 200, { hostIp: "127.0.0.1", hostPort: Number(mapping[1]), containerPort: 4173 })
        : send(response, 404, { error: "MAPPING_NOT_FOUND" });
    }
    const status = await docker(["inspect", "--format", "{{.State.Status}}", id]);
    return send(response, 200, { id, status: status === "running" ? "running" : "stopped" });
  } catch (error) {
    const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr).slice(-500) : "";
    console.error(`[runtime-controller] ${request.method} ${request.url} failed: ${error instanceof Error ? error.message : String(error)}${detail ? ` stderr=${detail}` : ""}`);
    if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
      return send(response, 413, { error: "REQUEST_BODY_TOO_LARGE" });
    }
    if (error instanceof SyntaxError) return send(response, 400, { error: "INVALID_JSON" });
    // Do not disclose whether an arbitrary host container exists. Only
    // controller-managed preview runtimes are addressable through this API.
    if (error instanceof Error && error.message === "RUNTIME_NOT_MANAGED") {
      return send(response, 404, { error: "NOT_FOUND" });
    }
    return send(response, 503, { error: "RUNTIME_UNAVAILABLE" });
  }
});

server.listen(Number(process.env.PORT ?? 8787), "0.0.0.0");
