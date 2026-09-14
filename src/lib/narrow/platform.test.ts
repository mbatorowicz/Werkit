import { describe, expect, it } from "vitest";
import { narrowPlatformTenantUsers } from "./platform";

describe("narrowPlatformTenantUsers", () => {
  it("odrzuca obiekt błędu 500 i wiersze bez id", () => {
    expect(narrowPlatformTenantUsers({ error: "server_error" })).toEqual([]);
    expect(
      narrowPlatformTenantUsers([
        {
          id: 3,
          fullName: "Anna",
          usernameEmail: "a@x.pl",
          role: "admin",
          isActive: true,
          lastLoginAt: null,
        },
        { fullName: "brak id", role: "admin" },
        { id: 4, role: "worker", fullName: "Worker", usernameEmail: "w@x.pl", isActive: true },
      ])
    ).toEqual([
      {
        id: 3,
        fullName: "Anna",
        usernameEmail: "a@x.pl",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
      },
    ]);
  });
});
