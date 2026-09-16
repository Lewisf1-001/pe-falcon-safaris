import { describe, it, expect } from "vitest";
import {
  isCurrencyCode,
  toUsdExact,
  convertFromUsd,
  convertAmount,
  formatAmount,
  DEFAULT_RATES,
} from "../lib/currency";

describe("Currency & Pricing Utility Tests", () => {
  it("validates currency codes correctly", () => {
    expect(isCurrencyCode("USD")).toBe(true);
    expect(isCurrencyCode("KES")).toBe(true);
    expect(isCurrencyCode("EUR")).toBe(true);
    expect(isCurrencyCode("GBP")).toBe(true);
    expect(isCurrencyCode("XYZ")).toBe(false);
    expect(isCurrencyCode("")).toBe(false);
  });

  it("converts amounts to USD exact", () => {
    // KES rate is 129
    expect(toUsdExact(1290, "KES", DEFAULT_RATES)).toBe(10);
    expect(toUsdExact(1, "USD", DEFAULT_RATES)).toBe(1);
    // Invalid input / zero / negative
    expect(toUsdExact(0, "USD", DEFAULT_RATES)).toBe(0);
    expect(toUsdExact(-100, "USD", DEFAULT_RATES)).toBe(0);
    expect(toUsdExact(NaN, "USD", DEFAULT_RATES)).toBe(0);
  });

  it("converts amounts from USD", () => {
    expect(convertFromUsd(10, "USD", DEFAULT_RATES)).toBe(10);
    expect(convertFromUsd(10, "KES", DEFAULT_RATES)).toBe(1290); // 10 * 129
    expect(convertFromUsd(10, "EUR", DEFAULT_RATES)).toBe(9.2); // 10 * 0.92
    expect(convertFromUsd(0, "KES", DEFAULT_RATES)).toBe(0);
    expect(convertFromUsd(-5, "KES", DEFAULT_RATES)).toBe(0);
  });

  it("performs cross-currency conversions", () => {
    // 1290 KES -> 10 USD -> 9.2 EUR
    const kesToEur = convertAmount(1290, "KES", "EUR", DEFAULT_RATES);
    expect(kesToEur).toBe(9.2);

    // Same currency
    expect(convertAmount(500, "USD", "USD", DEFAULT_RATES)).toBe(500);
  });

  it("formats amounts cleanly", () => {
    expect(formatAmount(1200, "USD")).toContain("1,200");
    expect(formatAmount(129000, "KES")).toContain("129,000");
  });

  describe("Package Pricing & Guest Count Logic", () => {
    const basePriceUsd = 1250; // e.g. Serengeti Migration Safari per guest

    it("calculates pricing for single and multiple guests", () => {
      const calculateTotal = (guests: number) => {
        if (!Number.isInteger(guests) || guests <= 0) return 0;
        return basePriceUsd * guests;
      };

      expect(calculateTotal(1)).toBe(1250);
      expect(calculateTotal(2)).toBe(2500);
      expect(calculateTotal(5)).toBe(6250);
    });

    it("handles invalid, zero, or negative guest counts safely", () => {
      const calculateTotal = (guests: number) => {
        if (!Number.isInteger(guests) || guests <= 0) return 0;
        return basePriceUsd * guests;
      };

      expect(calculateTotal(0)).toBe(0);
      expect(calculateTotal(-1)).toBe(0);
      expect(calculateTotal(NaN)).toBe(0);
      expect(calculateTotal(2.5)).toBe(0); // non-integer guest count
    });
  });
});
