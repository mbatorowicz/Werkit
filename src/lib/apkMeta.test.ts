import { describe, expect, it } from "vitest";
import { parseAndroidApkMeta } from "@/lib/apkMeta";

describe("parseAndroidApkMeta", () => {
  it("parsuje release z podpisem Play", () => {
    const meta = parseAndroidApkMeta({
      version: "1.9.4",
      packageVersion: "1.9.4",
      buildType: "release",
      signing: "play-upload",
      commitSha: "abc",
      builtAt: "2026-09-15T12:00:00.000Z",
    });
    expect(meta?.signing).toBe("play-upload");
    expect(meta?.buildType).toBe("release");
  });

  it("ignoruje nieznany signing i nadal zwraca meta", () => {
    const meta = parseAndroidApkMeta({
      version: "1.9.4",
      buildType: "release",
      signing: "something-else",
    });
    expect(meta).not.toBeNull();
    expect(meta?.signing).toBeUndefined();
  });

  it("odrzuca brak version", () => {
    expect(parseAndroidApkMeta({ buildType: "release" })).toBeNull();
  });
});
