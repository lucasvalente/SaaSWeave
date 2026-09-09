import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "#@/locale-config";

export const LOCALE_COOKIE = "saasweave_locale";
export const LOCALE_STORAGE_KEY = "saasweave.locale";

export function normalizeLocale(value: string | null | undefined): SupportedLocale | undefined {
  if (!value) return undefined;
  const language = value.trim().toLowerCase();
  if (language === "pt-br" || language.startsWith("pt-")) return "pt-BR";
  if (language === "pt") return "pt-BR";
  if (language === "en" || language.startsWith("en-")) return "en";
  if (language === "es" || language.startsWith("es-")) return "es";
  return undefined;
}

export function localeFromCookieHeader(
  cookieHeader: string | null | undefined
): SupportedLocale | undefined {
  const match = cookieHeader?.match(/(?:^|;\s*)saasweave_locale=([^;]+)/i);
  if (!match?.[1]) return undefined;
  try {
    return normalizeLocale(decodeURIComponent(match[1]));
  } catch {
    return undefined;
  }
}

export function localeFromAcceptLanguage(
  header: string | null | undefined
): SupportedLocale | undefined {
  if (!header) return undefined;
  const candidates = header
    .split(",")
    .map((part, index) => {
      const [raw, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { locale: raw, quality: q ? Number(q.trim().slice(2)) || 0 : 1, index };
    })
    .sort((a: { quality: number; index: number }, b: { quality: number; index: number }) => b.quality - a.quality || a.index - b.index);
  for (const candidate of candidates) {
    const resolved = normalizeLocale(candidate.locale);
    if (resolved) return resolved;
  }
  return undefined;
}

export function resolveLocale(
  options: {
    cookie?: string | null;
    acceptLanguage?: string | null;
    stored?: string | null;
  } = {}
): SupportedLocale {
  // The browser language is intentionally not an implicit product preference.
  // This application defaults to Portuguese; only an explicit persisted choice
  // may override it. An invalid cookie is treated as an invalid preference and
  // must not silently fall through to a stale localStorage value.
  const hasCookie = options.cookie?.match(/(?:^|;\s*)saasweave_locale=/i);
  if (hasCookie) {
    return localeFromCookieHeader(options.cookie) ?? DEFAULT_LOCALE;
  }
  return normalizeLocale(options.stored) ?? DEFAULT_LOCALE;
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
