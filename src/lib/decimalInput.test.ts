import { describe, expect, it } from "vitest";
import {
  decimalStringForStorage,
  normalizeDecimalBodyField,
  parseDecimalInput,
  parsePositiveDecimalField,
  sanitizeDecimalTyping,
} from "./decimalInput";

describe("decimalInput", () => {
  it("parseDecimalInput akceptuje przecinek i kropkę", () => {
    expect(parseDecimalInput("45,50")).toBe(45.5);
    expect(parseDecimalInput("45.50")).toBe(45.5);
    expect(parseDecimalInput("0,75")).toBe(0.75);
  });

  it("decimalStringForStorage zwraca kanoniczny zapis z kropką", () => {
    expect(decimalStringForStorage("12,5")).toBe("12.5");
    expect(decimalStringForStorage("")).toBeNull();
    expect(decimalStringForStorage("abc")).toBeNull();
  });

  it("normalizeDecimalBodyField z number i string", () => {
    expect(normalizeDecimalBodyField("3,14")).toBe("3.14");
    expect(normalizeDecimalBodyField(10)).toBe("10");
  });

  it("parsePositiveDecimalField odrzuca zero i śmieci", () => {
    expect(parsePositiveDecimalField("0")).toEqual({ ok: false });
    expect(parsePositiveDecimalField("1,5")).toEqual({ ok: true, value: "1.5" });
  });

  it("sanitizeDecimalTyping blokuje drugi separator", () => {
    expect(sanitizeDecimalTyping("12,34,5")).toBe("12,345");
    expect(sanitizeDecimalTyping("12.3.4")).toBe("12.34");
  });
});
