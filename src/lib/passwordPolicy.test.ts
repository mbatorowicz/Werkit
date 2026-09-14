import { describe, expect, it } from "vitest";
import { isPasswordPolicyOk, PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

describe("passwordPolicy", () => {
  it("wymaga co najmniej 6 znaków", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
    expect(isPasswordPolicyOk("12345")).toBe(false);
    expect(isPasswordPolicyOk("1234")).toBe(false);
    expect(isPasswordPolicyOk("abcde")).toBe(false);
  });

  it("odrzuca trywialne PIN-y z listy", () => {
    expect(isPasswordPolicyOk("123456")).toBe(false);
    expect(isPasswordPolicyOk("000000")).toBe(false);
    expect(isPasswordPolicyOk("111111")).toBe(false);
  });

  it("odrzuca hasło równe loginowi (bez względu na wielkość liter)", () => {
    expect(isPasswordPolicyOk("janek1", "janek1")).toBe(false);
    expect(isPasswordPolicyOk("Janek1", "janek1")).toBe(false);
  });

  it("akceptuje PIN / hasło spełniające politykę", () => {
    expect(isPasswordPolicyOk("482917", "janek_k")).toBe(true);
    expect(isPasswordPolicyOk("Itest-haslo-123!", "admin@firma.pl")).toBe(true);
  });
});
