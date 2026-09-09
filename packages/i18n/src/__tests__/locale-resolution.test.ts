import { describe, expect, it } from "vite-plus/test";

import {
  localeFromAcceptLanguage,
  localeFromCookieHeader,
  normalizeLocale,
  resolveLocale
} from "../tanstack-start/locale-resolution";

describe("locale resolution", () => {
  it.each([
    ["pt", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["en-US", "en"],
    ["es-MX", "es"]
  ] as const)("normalizes %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
  it("uses cookie before stored/browser/default", () => {
    expect(
      resolveLocale({ cookie: "saasweave_locale=en", stored: "es", acceptLanguage: "pt-BR" })
    ).toBe("en");
  });
  it.each([
    ["pt-BR", "pt-BR"],
    ["en", "en"],
    ["es", "es"]
  ] as const)("honors a valid %s cookie", (cookieLocale, expected) => {
    expect(
      resolveLocale({ cookie: `saasweave_locale=${cookieLocale}`, acceptLanguage: "en-US" })
    ).toBe(expected);
  });
  it("defaults to pt-BR when no cookie, stored preference, or browser locale exists", () => {
    expect(resolveLocale()).toBe("pt-BR");
    expect(resolveLocale({ cookie: null, stored: null, acceptLanguage: null })).toBe("pt-BR");
  });
  it("resolves Accept-Language", () => {
    expect(localeFromAcceptLanguage("es-MX, en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("fr, pt-BR;q=0.9")).toBe("pt-BR");
  });
  it("falls back safely for invalid values", () => {
    expect(localeFromCookieHeader("saasweave_locale=de")).toBeUndefined();
    expect(
      resolveLocale({ cookie: "saasweave_locale=de", stored: "en", acceptLanguage: "en-US" })
    ).toBe("pt-BR");
  });
  it("defaults to pt-BR without an explicit persisted preference", () => {
    expect(resolveLocale({ acceptLanguage: "en-US" })).toBe("pt-BR");
  });
  it("uses localStorage only when the locale cookie is absent", () => {
    expect(resolveLocale({ stored: "en", acceptLanguage: "pt-BR" })).toBe("en");
    expect(resolveLocale({ cookie: "saasweave_locale=invalid", stored: "es" })).toBe("pt-BR");
  });
});
