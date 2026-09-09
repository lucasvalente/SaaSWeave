import { describe, expect, it } from "vite-plus/test";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber
} from "../tanstack-start/locale-formatters";

describe("locale formatters", () => {
  it.each(["pt-BR", "en", "es"] as const)(
    "formats date, datetime, number and currency for %s",
    (locale) => {
      expect(formatDate("2024-01-02T12:00:00Z", locale)).not.toBe("");
      expect(formatDateTime("2024-01-02T12:00:00Z", locale)).not.toBe("");
      expect(formatNumber(1234.5, locale)).not.toBe("");
      expect(formatCurrency(1234.5, "USD", locale)).toContain("$");
    }
  );
});
