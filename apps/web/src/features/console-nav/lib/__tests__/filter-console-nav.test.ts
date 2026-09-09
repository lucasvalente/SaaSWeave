import { describe, expect, it } from "vite-plus/test";

import { getConsoleNav } from "@/features/console-nav/config/console-nav.config";
import {
  collectEnabledFeatureKeys,
  filterConsoleNavByFeatures,
  isConsoleFeatureEnabled
} from "@/features/console-nav/lib/filter-console-nav";

describe("filterConsoleNavByFeatures", () => {
  it("hides nav items when their feature is disabled", () => {
    const filtered = filterConsoleNavByFeatures(getConsoleNav(), new Set(["api_keys"]));
    const paths = filtered.flatMap((group) => group.items.map((item) => item.to));

    expect(paths).toContain("/app/api-keys");
    expect(paths).not.toContain("/app/webhooks");
    expect(paths).not.toContain("/app/features");
    expect(paths).not.toContain("/app/billing");
    expect(paths).not.toContain("/app/team");
    expect(paths).not.toContain("/app/notifications");
    expect(paths).not.toContain("/app/security");
  });

  it("shows gated nav items when their feature keys are enabled", () => {
    const filtered = filterConsoleNavByFeatures(
      getConsoleNav(),
      new Set(["billing_portal", "team_management", "notifications", "two_factor", "audit_logs"])
    );
    const paths = filtered.flatMap((group) => group.items.map((item) => item.to));

    expect(paths).toContain("/app/billing");
    expect(paths).toContain("/app/team");
    expect(paths).toContain("/app/notifications");
    expect(paths).toContain("/app/security");
    expect(paths).toContain("/app/audit");
  });

  it.each([
    ["ai_assistant", "/app/ai-usage"],
    ["batch_jobs", "/app/batch-jobs"],
    ["billing_portal", "/app/billing"],
    ["api_keys", "/app/api-keys"],
    ["webhooks", "/app/webhooks"],
    ["team_management", "/app/team"],
    ["notifications", "/app/notifications"],
    ["audit_logs", "/app/audit"],
    ["two_factor", "/app/security"]
  ])("reveals only the matching shell navigation item for %s", (featureKey, expectedPath) => {
    const paths = filterConsoleNavByFeatures(getConsoleNav(), new Set([featureKey])).flatMap(
      (group) => group.items.map((item) => item.to)
    );

    expect(paths).toContain(expectedPath);
    expect(paths).toContain("/app/projects");

    const gatedPaths = [
      "/app/ai-usage",
      "/app/batch-jobs",
      "/app/billing",
      "/app/api-keys",
      "/app/webhooks",
      "/app/team",
      "/app/notifications",
      "/app/audit",
      "/app/security"
    ];

    expect(paths.filter((path) => gatedPaths.includes(path))).toEqual([expectedPath]);
  });

  it("does not reveal a gated route for an unknown entitlement", () => {
    const paths = filterConsoleNavByFeatures(getConsoleNav(), new Set(["unknown_feature"])).flatMap(
      (group) => group.items.map((item) => item.to)
    );

    expect(paths).toContain("/app");
    expect(paths).toContain("/app/projects");
    expect(paths).not.toContain("/app/billing");
    expect(paths).not.toContain("/app/notifications");
  });

  it("removes groups that contain no available items", () => {
    const groups = filterConsoleNavByFeatures(
      [
        {
          heading: "Gated",
          items: [
            {
              featureKey: "billing_portal",
              icon: getConsoleNav()[0]!.items[0]!.icon,
              label: "Billing",
              to: "/app/billing"
            }
          ]
        },
        {
          heading: "Always available",
          items: [{ icon: getConsoleNav()[0]!.items[0]!.icon, label: "Overview", to: "/app" }]
        }
      ],
      new Set()
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.heading).toBe("Always available");
  });

  it("collects enabled feature keys", () => {
    const keys = collectEnabledFeatureKeys([
      { enabledForOrg: true, key: "api_keys" },
      { enabledForOrg: false, key: "webhooks" }
    ]);

    expect(keys.has("api_keys")).toBe(true);
    expect(keys.has("webhooks")).toBe(false);
  });

  it("fails closed for shared feature-gated controls", () => {
    const features = [
      { enabledForOrg: true, key: "notifications" },
      { enabledForOrg: false, key: "billing_portal" }
    ];

    expect(isConsoleFeatureEnabled(features, "notifications")).toBe(true);
    expect(isConsoleFeatureEnabled(features, "billing_portal")).toBe(false);
    expect(isConsoleFeatureEnabled(undefined, "team_management")).toBe(false);
    expect(isConsoleFeatureEnabled([], "notifications")).toBe(false);
    expect(isConsoleFeatureEnabled(features, "unknown_feature")).toBe(false);
  });
});
