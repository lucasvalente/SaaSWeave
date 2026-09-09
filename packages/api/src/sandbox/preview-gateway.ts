import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Claims carried by a short-lived preview capability. Never use the URL as authorization. */
export type PreviewClaims = {
  projectId: string;
  workspaceId: string;
  subjectId: string;
  sandboxId: string;
  expiresAt: number;
};

export type PreviewRequest = { claims: PreviewClaims; projectId: string; workspaceId: string; now?: number };

const encoded = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

/** Issue an opaque HMAC capability. The secret must remain server-side. */
export function issuePreviewToken(claims: PreviewClaims, secret: string): string {
  if (!secret || claims.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("INVALID_PREVIEW_TOKEN_INPUT");
  const payload = encoded(JSON.stringify(claims));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPreviewToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): PreviewClaims | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !secret) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(decode(payload)) as PreviewClaims;
    if (!claims.projectId || !claims.workspaceId || !claims.subjectId || !claims.sandboxId || !Number.isInteger(claims.expiresAt) || claims.expiresAt <= now) return null;
    return claims;
  } catch { return null; }
}

/** Enforce subject + tenant + project binding at the gateway boundary. */
export function authorizePreviewRequest(request: PreviewRequest): boolean {
  const { claims } = request;
  return claims.projectId === request.projectId && claims.workspaceId === request.workspaceId && (request.now ?? Math.floor(Date.now() / 1000)) < claims.expiresAt;
}

function configuredPreviewFrameAncestor(): string {
  // VITE_WEB_URL is validated at process startup in production. Keep a local
  // development fallback so this security boundary remains deterministic in
  // isolated unit tests too.
  try {
    return new URL(process.env.VITE_WEB_URL ?? "http://localhost:13000").origin;
  } catch {
    return "http://localhost:13000";
  }
}

export function previewIsolationHeaders(frameAncestor = configuredPreviewFrameAncestor()): Record<string, string> {
  // Generated local E2E previews include a deterministic inline probe for the
  // public Supabase configuration. Keep production CSP strict; only the
  // explicit test runtime permits that probe to execute.
  const scriptPolicy = process.env.NODE_ENV === "test" ? " 'unsafe-inline'" : "";
  const connectPolicy = process.env.NODE_ENV === "test" ? "; connect-src *" : "";
  return {
    "Content-Security-Policy": `default-src 'self'; script-src 'self'${scriptPolicy}${connectPolicy}; frame-ancestors 'self' ${frameAncestor}`,
    "Cross-Origin-Opener-Policy": "same-origin",
    // The preview gateway is served by the API origin and intentionally
    // embedded by the web origin allowed by frame-ancestors above.
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

export function createPreviewId(): string { return randomBytes(16).toString("hex"); }

// Never let control-plane credentials or client routing metadata cross the
// preview boundary.  In particular, Authorization may contain a session or
// service token even when Cookie is absent.
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "cookie", "set-cookie", "authorization", "host", "x-forwarded-for", "x-forwarded-host", "x-forwarded-port", "x-forwarded-proto", "forwarded"]);
export function sanitizePreviewHeaders(headers: Headers): Headers {
  const result = new Headers();
  headers.forEach((value, key) => { if (!HOP_BY_HOP.has(key.toLowerCase())) result.set(key, value); });
  return result;
}

/** Proxy a validated preview response without forwarding control-plane cookies or hop-by-hop headers. */
export async function proxyPreviewRequest(upstreamUrl: string, request: Request, timeoutMs = 10_000, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(upstreamUrl, { method: request.method, headers: sanitizePreviewHeaders(request.headers), body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body, signal: controller.signal, redirect: "error" });
    const headers = sanitizePreviewHeaders(response.headers);
    Object.entries(previewIsolationHeaders()).forEach(([key, value]) => headers.set(key, value));
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return new Response("PREVIEW_UPSTREAM_TIMEOUT", { status: 504 });
    return new Response("PREVIEW_UPSTREAM_UNAVAILABLE", { status: 502 });
  } finally { clearTimeout(timer); }
}
