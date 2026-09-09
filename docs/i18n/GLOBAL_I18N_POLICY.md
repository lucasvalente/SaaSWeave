# Global Internationalization Policy

The platform uses Paraglide JS as its single user-interface translation system.

Supported locales are `pt-BR`, `en`, and `es`. Brazilian Portuguese is the default locale and English is the technical fallback. Source code, API contracts, database schema, permission keys, audit keys, and internal enums remain English.

Every user-facing feature must add matching message keys in all three locale catalogs before it is complete. Locale catalogs must retain key parity, and CI validation must reject missing keys. UI must use message keys; stored notifications and audit events keep stable event keys plus metadata and are translated when rendered.

Locale resolution order is authenticated-user preference, SSR-compatible visitor preference, browser language, then `pt-BR`. Locale is independent from currency and timezone. New user-facing errors, email templates, and notifications must also use the shared catalogs.

Future modules—including admin, customer app, authentication, MFA, builder, billing, agents, files, deployments, and integrations—must reuse this infrastructure rather than creating module-local translation systems.
