/**
 * Creates the request passed to Better Auth with a client-IP header that the
 * application, rather than the browser, controls. The local Docker topology
 * exposes the API directly, so incoming forwarding headers are untrusted.
 */
export function createTrustedAuthRequest(request: Request, socketAddress?: string | null): Request {
  const headers = new Headers(request.headers);

  // Never let a direct caller select a Better Auth rate-limit bucket.
  headers.delete("x-client-ip");
  headers.delete("x-forwarded-for");
  headers.delete("x-real-ip");

  const clientIp = socketAddress?.trim();
  if (clientIp) headers.set("x-client-ip", clientIp);

  return new Request(request, { headers });
}
