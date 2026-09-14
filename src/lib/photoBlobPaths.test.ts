import { describe, expect, it } from "vitest";
import { sessionPhotoBlobKey, sessionPhotoBlobPrefixes } from "@/lib/photoBlobPaths";

describe("session photo blob paths", () => {
  it("nowe uploady zawierają companyId", () => {
    expect(sessionPhotoBlobKey(7, 42, "AD_HOC", "jpg", 1700000000000)).toBe(
      "werkit-photos/7/42/1700000000000_ad_hoc.jpg"
    );
  });

  it("kasowanie listuje nowy i legacy prefiks", () => {
    expect(sessionPhotoBlobPrefixes(42, 7)).toEqual(["werkit-photos/7/42/", "werkit-photos/42/"]);
  });

  it("bez companyId zostaje tylko legacy prefiks", () => {
    expect(sessionPhotoBlobPrefixes(42)).toEqual(["werkit-photos/42/"]);
  });
});
