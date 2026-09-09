import { m } from "@saasweave/i18n/messages";

/** Keeps persisted project status values internal while presenting localized labels. */
export function projectStatusLabel(status: "draft" | "active" | "archived" | string) {
  switch (status) {
    case "draft":
      return m.project__draft();
    case "active":
      return m.project__active();
    case "archived":
      return m.project__archived();
    default:
      return status;
  }
}
