import { describe, expect, it } from "vite-plus/test";

import { createTrustedAuthRequest } from "#@/auth/request";

describe("createTrustedAuthRequest", () => {
  it("replaces caller-supplied forwarding headers with the observed socket address", () => {
    const request = createTrustedAuthRequest(
      new Request("http://localhost/auth/sign-in/email", {
        headers: {
          "x-client-ip": "203.0.113.55",
          "x-forwarded-for": "203.0.113.55",
          "x-real-ip": "203.0.113.55"
        }
      }),
      "192.0.2.10"
    );

    expect(request.headers.get("x-client-ip")).toBe("192.0.2.10");
    expect(request.headers.get("x-forwarded-for")).toBeNull();
    expect(request.headers.get("x-real-ip")).toBeNull();
  });
});
