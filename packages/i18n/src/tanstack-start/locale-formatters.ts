import { baseLocale, type locales } from "#@/paraglide/runtime";

type Locale = (typeof locales)[number];

export function formatDate(value: Date | string | number, locale: Locale = baseLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: Date | string | number, locale: Locale = baseLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

export function formatNumber(value: number, locale: Locale = baseLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(
  value: number,
  currency = "BRL",
  locale: Locale = baseLocale
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
