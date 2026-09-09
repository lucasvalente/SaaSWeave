import { useQuery } from "@tanstack/react-query";

import { m } from "@saasweave/i18n/messages";

import { Badge, SectionHeading } from "@/shared/ui/console-kit";

import { getStatusQueryOptions } from "@/pages/status/api/get-status.query";

export function StatusPage() {
  const status = useQuery(getStatusQueryOptions());

  const unreachable = status.isError;
  const healthy = !unreachable && status.data?.status === "healthy";
  const checks = Object.entries(status.data?.checks ?? {});

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <SectionHeading
        eyebrow={m.status__platform()}
        title={m.status__title()}
        description={m.status__description()}
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{m.status__api_readiness()}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.isLoading
                ? m.status__checking()
                : unreachable
                  ? "Could not reach the status endpoint."
                  : healthy
                    ? m.status__all_healthy()
                    : m.status__degraded_description()}
            </p>
          </div>
          <Badge tone={status.isLoading ? "neutral" : healthy ? "success" : "destructive"}>
            {status.isLoading
              ? m.status__checking_short()
              : unreachable
                ? m.status__unreachable()
                : healthy
                  ? m.status__healthy()
                  : m.status__degraded()}
          </Badge>
        </div>

        {checks.length > 0 && (
          <ul className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
            {checks.map(([name, check]) => (
              <li key={name} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-foreground">{name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {typeof check.latencyMs === "number" && <span>{check.latencyMs}ms</span>}
                  <Badge tone={check.status === "healthy" ? "success" : "destructive"}>
                    {check.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
