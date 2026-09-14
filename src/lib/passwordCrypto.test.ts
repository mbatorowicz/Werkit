import { describe, expect, it } from "vitest";
import { comparePassword, DUMMY_BCRYPT_HASH } from "@/lib/passwordCrypto";

describe("DUMMY_BCRYPT_HASH", () => {
  it("jest hashem bcrypt cost 10 (timing dummy, nie z env)", () => {
    expect(DUMMY_BCRYPT_HASH).toMatch(/^\$2[aby]\$10\$/);
    expect(DUMMY_BCRYPT_HASH.includes("process.env")).toBe(false);
  });

  it("compare z dowolnym hasłem kończy się false (wynik i tak ignorowany na loginie)", async () => {
    await expect(comparePassword("nie-to-haslo-123456", DUMMY_BCRYPT_HASH)).resolves.toBe(false);
  });
});
