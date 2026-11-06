/** Identity rendered by the authenticated worker layout, never inferred from queued data. */
export function offlineOwner(): string | null {
  if (typeof document === "undefined") return null;
  const owner = document.querySelector<HTMLMetaElement>(
    'meta[name="werkit-offline-owner"]'
  )?.content;
  return owner && /^\d+:\d+$/.test(owner) ? owner : null;
}
export function requireOfflineOwner(): string {
  const owner = offlineOwner();
  if (!owner) throw new Error("offline_account_required");
  return owner;
}
