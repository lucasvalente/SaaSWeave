export const DEFAULT_LOCALE = "pt-BR" as const;
export const FALLBACK_LOCALE = "en" as const;
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, FALLBACK_LOCALE, "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
