import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";

import { getConsoleNav } from "@/features/console-nav/config/console-nav.config";
import {
  collectEnabledFeatureKeys,
  filterConsoleNavByFeatures,
  isConsoleFeatureEnabled
} from "@/features/console-nav/lib/filter-console-nav";

export function useConsoleNavGroups() {
  const featuresQuery = useQuery(orpc.console.features.queryOptions());

  return useMemo(() => {
    const enabledKeys = featuresQuery.data
      ? collectEnabledFeatureKeys(featuresQuery.data)
      : new Set<string>();
    return filterConsoleNavByFeatures(getConsoleNav(), enabledKeys);
  }, [featuresQuery.data]);
}

/** Returns whether a workspace capability is currently available to the user. */
export function useConsoleFeatureEnabled(featureKey: string): boolean {
  const featuresQuery = useQuery(orpc.console.features.queryOptions());
  return isConsoleFeatureEnabled(featuresQuery.data, featureKey);
}
