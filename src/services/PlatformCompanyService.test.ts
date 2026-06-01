import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));

import { PlatformCompanyService } from "./PlatformCompanyService";

describe("PlatformCompanyService.mapCreateError", () => {
  it("mapuje unikalny slug", () => {
    const err = Object.assign(
      new Error('duplicate key value violates unique constraint "companies_slug_key"'),
      {
        code: "23505",
      }
    );
    expect(PlatformCompanyService.mapCreateError(err)).toBe("slug_exists");
  });

  it("mapuje unikalny email admina", () => {
    const err = Object.assign(
      new Error('duplicate key value violates unique constraint "users_username_email_key"'),
      {
        code: "23505",
      }
    );
    expect(PlatformCompanyService.mapCreateError(err)).toBe("user_exists");
  });

  it("ignoruje inne błędy", () => {
    expect(PlatformCompanyService.mapCreateError(new Error("network"))).toBeNull();
  });
});
