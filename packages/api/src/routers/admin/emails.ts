import { z } from "zod";

import {
  getEmailCopy,
  getEmailDeliveries,
  recordEmailDelivery,
  saveEmailCopy
} from "@saasweave/db";
import { EMAIL_TEMPLATES, getTemplate, renderTemplate, sendTemplate } from "@saasweave/mailer";

import { requirePlatformPermission } from "#@/lib/procedures/factory";

/**
 * Admin email router — lets the platform operator review the transactional
 * template catalog, edit copy + subject lines (persisted as overrides), preview
 * the rendered HTML, and fire a test send. Runs with no mail provider
 * configured (console mode); a real provider activates delivery.
 */

/** One template with its field schema and any saved admin overrides applied. */
async function describeTemplate(key: string) {
  const template = getTemplate(key);
  if (!template) throw new Error(`Unknown template: ${key}`);
  const override = await getEmailCopy(key);
  const fields = template.fields.map((field) => {
    return {
      default: field.default,
      key: field.key,
      kind: field.kind,
      label: field.label,
      multiline: field.multiline ?? false,
      value: override.copy[field.key] ?? field.default
    };
  });
  return {
    description: template.description,
    fields,
    key: template.key,
    name: template.name,
    subject: override.subject ?? template.subject,
    subjectDefault: template.subject
  };
}

export const adminEmailsRouter = {
  list: requirePlatformPermission("system_settings.read")
    .route({
      description: "Transactional email templates with editable copy + saved overrides",
      method: "GET"
    })
    .handler(async () =>
      Promise.all(EMAIL_TEMPLATES.map((template) => describeTemplate(template.key)))
    ),

  preview: requirePlatformPermission("system_settings.read")
    .route({
      description: "Render a template to HTML with the supplied copy + subject",
      method: "POST"
    })
    .input(
      z.object({
        copy: z.record(z.string(), z.string()).default({}),
        key: z.string(),
        subject: z.string().optional()
      })
    )
    .handler(async ({ input }) => {
      const rendered = await renderTemplate(input.key, {}, input.copy, input.subject);
      if (!rendered) throw new Error(`Unknown template: ${input.key}`);
      return { html: rendered.html, subject: rendered.subject };
    }),

  save: requirePlatformPermission("system_settings.write")
    .route({
      description: "Persist copy + subject overrides for a template",
      method: "POST"
    })
    .input(
      z.object({
        copy: z.record(z.string(), z.string()),
        key: z.string(),
        subject: z.string().nullable()
      })
    )
    .handler(async ({ input }) => {
      await saveEmailCopy(input.key, input.subject, input.copy);
      return describeTemplate(input.key);
    }),

  sendTest: requirePlatformPermission("system_settings.write")
    .route({
      description: "Send a test render of a template to an email address",
      method: "POST"
    })
    .input(z.object({ key: z.string(), to: z.email() }))
    .handler(async ({ input }) => {
      await sendTemplate(input.key, input.to, undefined, undefined, {
        getCopy: getEmailCopy,
        recordDelivery: recordEmailDelivery
      });
      return { ok: true };
    }),

  deliveries: requirePlatformPermission("system_settings.read")
    .route({
      description: "Recent transactional email delivery attempts, newest first",
      method: "GET"
    })
    .handler(() => getEmailDeliveries({ limit: 30 }))
};
