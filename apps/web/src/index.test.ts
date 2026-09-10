import { describe, expect, it } from "vitest";
import { getQueryClient } from "./lib/query-client";
import { createRouter } from "./router";
import { sessionUiStore } from "./stores/tanstack-store";
import { useUiStore } from "./stores/ui-store";

describe("apps/web foundation", () => {
  it("should create TanStack Router instance with registered root and index routes", () => {
    const router = createRouter();
    expect(router).toBeDefined();
    expect(router.routeTree).toBeDefined();
  });

  it("should export getRouter for TanStack Start SSR hydration integration", async () => {
    const { getRouter } = await import("./router");
    expect(typeof getRouter).toBe("function");
    const router = getRouter();
    expect(router).toBeDefined();
  });

  it("should initialize TanStack QueryClient with production-safe defaults", () => {
    const qc = getQueryClient();
    expect(qc).toBeDefined();
    expect(qc.getDefaultOptions().queries?.retry).toBe(1);
  });

  it("should manage UI state via Zustand without server state pollution", () => {
    const state = useUiStore.getState();
    expect(state.sidebarOpen).toBe(false);
    state.toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
    state.setSidebarOpen(false);
    expect(useUiStore.getState().sidebarOpen).toBe(false);
  });

  it("should support TanStack Store for lightweight reactive state", () => {
    expect(sessionUiStore.state.lastActiveRoute).toBe("/");
    sessionUiStore.setState(() => ({ lastActiveRoute: "/health" }));
    expect(sessionUiStore.state.lastActiveRoute).toBe("/health");
  });
});
