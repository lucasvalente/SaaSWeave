import { createFileRoute } from "@tanstack/react-router";
import { AdminJobDetail } from "@/features/admin-system/ui/admin-job-detail";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/system/jobs/$jobId/")({
  component: () => <AdminJobDetail jobId={Route.useParams().jobId} queue={String(Route.useSearch().queue ?? "")} />,
  validateSearch: (search: Record<string, unknown>) => ({ queue: typeof search.queue === "string" ? search.queue : "" })
});
