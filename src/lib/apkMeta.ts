/** Metadane builda APK publikowane obok pliku w GitHub Release (`werkit-apk-meta.json`). */
export type AndroidApkBuildType = "debug" | "release";

export type AndroidApkMeta = {
  version: string;
  packageVersion: string;
  buildType: AndroidApkBuildType;
  commitSha?: string;
  builtAt?: string;
};

export const APK_META_ASSET_NAME = "werkit-apk-meta.json";

export function parseAndroidApkMeta(raw: unknown): AndroidApkMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const version = typeof o.version === "string" ? o.version.trim() : "";
  const packageVersion = typeof o.packageVersion === "string" ? o.packageVersion.trim() : version;
  const buildType =
    o.buildType === "release" ? "release" : o.buildType === "debug" ? "debug" : null;
  if (!version || !buildType) return null;
  const commitSha =
    typeof o.commitSha === "string" && o.commitSha.trim() ? o.commitSha.trim() : undefined;
  const builtAt = typeof o.builtAt === "string" && o.builtAt.trim() ? o.builtAt.trim() : undefined;
  return { version, packageVersion, buildType, commitSha, builtAt };
}
