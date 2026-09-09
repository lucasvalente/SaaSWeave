import { readFileSync } from "node:fs";

import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_LOCALE, FALLBACK_LOCALE, SUPPORTED_LOCALES } from "#@/locale-config";

const messagesDirectory = new URL("../../messages/", import.meta.url);
const localeNames = ["en", "pt-BR", "es"] as const;

function readMessages(locale: (typeof localeNames)[number]): Record<string, string> {
  return JSON.parse(readFileSync(new URL(`${locale}.json`, messagesDirectory), "utf8")) as Record<
    string,
    string
  >;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{[^}]+\}/g)].map(([match]) => match).sort();
}

describe("message catalog parity", () => {
  const catalogs = Object.fromEntries(localeNames.map((locale) => [locale, readMessages(locale)]));
  const englishKeys = Object.keys(catalogs.en).sort();

  it.each(localeNames)("keeps %s keys aligned with English", (locale) => {
    expect(Object.keys(catalogs[locale]).sort()).toEqual(englishKeys);
  });

  it.each(localeNames)("keeps %s interpolation placeholders aligned with English", (locale) => {
    for (const key of englishKeys) {
      expect(placeholders(catalogs[locale][key] ?? ""), key).toEqual(
        placeholders(catalogs.en[key] ?? "")
      );
    }
  });

  it("uses the official locale policy", () => {
    const settings = JSON.parse(
      readFileSync(new URL("../../project.inlang/settings.json", import.meta.url), "utf8")
    ) as { baseLocale: string; locales: string[] };

    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(FALLBACK_LOCALE).toBe("en");
    expect(SUPPORTED_LOCALES).toEqual(["pt-BR", "en", "es"]);
    expect(settings.baseLocale).toBe(DEFAULT_LOCALE);
    expect(settings.locales).toEqual(SUPPORTED_LOCALES);
    expect(settings.locales).not.toContain("de");
  });
});
