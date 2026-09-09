# Super Admin Map

The administrative router is rooted at `/{-$locale}/admin` and is gated by
`platform.dashboard.read` in the admin layout. Navigation is filtered against
the same permission map in `apps/web/src/features/console-nav/config/admin-nav.config.ts`.

| Route | Screen | Permission | Status |
|---|---|---|---|
| `/admin` | Dashboard | `platform.dashboard.read` | Implemented |
| `/admin/users` | Users | `users.read` | Implemented |
| `/admin/users/:id` | User detail | `users.read` | Implemented |
| `/admin/workspaces` | Workspaces | `workspaces.read` | Implemented |
| `/admin/workspaces/:id` | Workspace detail | `workspaces.read` | Implemented |
| `/admin/projects` | Projects | `projects.read` | Implemented |
| `/admin/projects/:projectId` | Project detail | `projects.read` | Implemented |
| `/admin/plans` | Plans catalog | `plans.read` | Implemented |
| `/admin/plans/:id` | Plan detail | `plans.read` | Implemented |
| `/admin/subscriptions` | Subscriptions | `subscriptions.read` | Implemented |
| `/admin/subscriptions/:id` | Subscription detail | `subscriptions.read` | Implemented |
| `/admin/usage` | Usage and credits | `usage.read` | Implemented |
| `/admin/billing` | Billing operations | `billing.read` | Implemented |
| `/admin/billing/invoices` | Invoice list | `billing.read` | Implemented |
| `/admin/billing/invoices/:id` | Invoice detail | `billing.read` | Implemented |
| `/admin/billing/profile` | Billing profile | `billing.read` | Implemented |
| `/admin/access/roles` | Roles and permissions | `users.roles.manage` | Implemented |
| `/admin/sessions` | Sessions | `sessions.read` | Implemented |
| `/admin/security/events` | Security events | `security.events.read` | Implemented |
| `/admin/audit` | Audit log | `audit.read` | Implemented |
| `/admin/feature-flags` | Feature flags | `feature_flags.read` | Implemented |
| `/admin/system/health` | System health | `infrastructure.read` | Implemented |
| `/admin/emails` | Emails | `system_settings.read` | Implemented |
| `/admin/settings` | Platform settings | `system_settings.read` | Implemented |

Detail routes inherit the list screen permission and are linked by the
corresponding list/detail UI. Billing routes are included because Billing V1
is already implemented; this consolidation does not add billing behavior.

Breadcrumb convention: every list screen starts at `Admin`; detail screens use
`Admin → <section> → <record>`. Related navigation is provided by the list
screen links and the shared admin sidebar.

All labels are resolved through the existing i18n message catalog (`pt-BR`,
`en`, `es`). Menu filtering is fail-closed: an item is omitted when its
required permission is absent.
