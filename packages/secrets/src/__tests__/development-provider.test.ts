import { describe, expect, it } from "vite-plus/test";

import { DevelopmentSecretProvider } from "@saasweave/secrets";

describe("DevelopmentSecretProvider", () => {
  it("returns only an opaque reference to callers", async () => {
    const provider = new DevelopmentSecretProvider();
    const reference = await provider.put("never-render-this");
    expect(reference).toMatch(/^secret:\/\/dev\//);
    await expect(provider.get(reference)).resolves.toBe("never-render-this");
    await provider.delete(reference);
    await expect(provider.get(reference)).resolves.toBeNull();
  });
});
