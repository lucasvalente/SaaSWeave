import { describe, expect, it } from "vitest";
import { Badge, Button, Card, cn, tokens } from "./index";

describe("packages/ui", () => {
  it("should provide design tokens", () => {
    expect(tokens.colors.primary.DEFAULT).toBe("#0284c7");
    expect(tokens.spacing.md).toBe("1rem");
    expect(tokens.radius.md).toBe("0.375rem");
  });

  it("should merge tailwind classes properly using cn", () => {
    const res = cn("px-2 py-1", "px-4");
    expect(res).toBe("py-1 px-4");
  });

  it("should export core primitives", () => {
    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
  });
});
