import { z } from "zod";

import { getPlatformAuditLog, recordAudit } from "@saasweave/db";

import { requirePlatformPermission } from "#@/lib/procedures/factory";
import { getPlatformSettings, updatePlatformSettings } from "#@/lib/settings";

const settingsPatchSchema = z.object({
  billingMode: z.enum(["subscription", "usage", "hybrid"]).optional(),
  currency: z.string().min(1).max(10).optional(),
  maintenanceMode: z.boolean().optional(),
  platformName: z.string().min(1).max(200).optional(),
  signupsOpen: z.boolean().optional(),
  supportEmail: z.email().optional(),
  trialsEnabled: z.boolean().optional()
});

export const adminSettingsRouter = {
  list: requirePlatformPermission("system_settings.read")
    .route({ description: "List non-secret platform settings", method: "GET" })
    .handler(() => getPlatformSettings()),
  get: requirePlatformPermission("system_settings.read")
    .route({ description: "Read the platform-wide settings singleton", method: "GET" })
    .handler(() => getPlatformSettings()),

  update: requirePlatformPermission("system_settings.write")
    .route({ description: "Update one or more platform-wide settings", method: "POST" })
    .input(settingsPatchSchema)
    .handler(async ({ context, input }) => {
      const updated = await updatePlatformSettings(input);
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "settings.updated",
        metadata: input,
        targetLabel: "platform settings",
        targetType: "platform_settings"
      });
      return updated;
    }),
  history: requirePlatformPermission("system_settings.read")
    .route({ description: "Platform settings change history", method: "GET" })
    .handler(() => getPlatformAuditLog({ resource: "platform_settings", limit: 100 }))
};
