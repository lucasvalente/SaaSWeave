import {
  type ConsoleNavGroup,
  type ConsoleNavItem
} from "@/features/console-nav/config/console-nav.config";

export function filterConsoleNavByFeatures(
  groups: ConsoleNavGroup[],
  enabledFeatureKeys: ReadonlySet<string>
): ConsoleNavGroup[] {
  return groups
    .map((group) => {
      return {
        ...group,
        items: group.items.filter(
          (item) => !item.featureKey || enabledFeatureKeys.has(item.featureKey)
        )
      };
    })
    .filter((group) => group.items.length > 0);
}

export function collectEnabledFeatureKeys(
  features: Array<{ enabledForOrg: boolean; key: string }>
): Set<string> {
  return new Set(features.filter((feature) => feature.enabledForOrg).map((feature) => feature.key));
}

/** Keep shared feature-gated controls aligned with the navigation fail-closed. */
export function isConsoleFeatureEnabled(
  features: Array<{ enabledForOrg: boolean; key: string }> | undefined,
  featureKey: string
): boolean {
  return features ? collectEnabledFeatureKeys(features).has(featureKey) : false;
}

export type { ConsoleNavItem };
