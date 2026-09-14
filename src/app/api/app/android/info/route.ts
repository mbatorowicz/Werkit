import { NextResponse } from "next/server";
import { jsonError } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { getAndroidAppDownloadInfoAsync } from "@/lib/androidAppDownload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INFO_ROLES = new Set(["admin", "viewer", "worker"]);

/** Metadane dostępnego APK (wersja, sync z web, build debug/release). */
export async function GET() {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;
  if (!INFO_ROLES.has(scoped.data.session.role)) {
    return jsonError("Forbidden", 403);
  }

  const info = await getAndroidAppDownloadInfoAsync();
  return NextResponse.json(info);
}
