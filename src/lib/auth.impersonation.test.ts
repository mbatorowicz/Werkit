import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { JWT_SECRET, parseAuthToken, signSessionJwt } from "@/lib/auth";

describe("parseAuthToken / signSessionJwt", () => {
  it("round-trip z impersonatorUserId", async () => {
    const token = await signSessionJwt(
      { userId: 10, role: "admin", companyId: 3, impersonatorUserId: 2 },
      "30m"
    );
    await expect(parseAuthToken(token)).resolves.toMatchObject({
      userId: 10,
      role: "admin",
      companyId: 3,
      impersonatorUserId: 2,
    });
  });

  it("token z exp w przeszłości nie przechodzi jwtVerify", async () => {
    const token = await new SignJWT({
      userId: 10,
      role: "admin",
      companyId: 3,
      impersonatorUserId: 2,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(0)
      .sign(JWT_SECRET);
    await expect(parseAuthToken(token)).resolves.toBeNull();
  });

  it("brak tokena → null", async () => {
    await expect(parseAuthToken(undefined)).resolves.toBeNull();
  });
});
