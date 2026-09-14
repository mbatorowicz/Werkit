const BLOB_PREFIX = "werkit-photos";

export function sessionPhotoBlobKey(
  companyId: number,
  sessionId: number,
  photoType: string,
  ext: string,
  now = Date.now()
): string {
  return `${BLOB_PREFIX}/${companyId}/${sessionId}/${now}_${photoType.toLowerCase()}.${ext}`;
}

/** Nowe uploady: `werkit-photos/{companyId}/{sessionId}/`. Stare: `werkit-photos/{sessionId}/`. */
export function sessionPhotoBlobPrefixes(sessionId: number, companyId?: number): string[] {
  const prefixes = [`${BLOB_PREFIX}/${sessionId}/`];
  if (companyId != null && companyId >= 1) {
    prefixes.unshift(`${BLOB_PREFIX}/${companyId}/${sessionId}/`);
  }
  return prefixes;
}
