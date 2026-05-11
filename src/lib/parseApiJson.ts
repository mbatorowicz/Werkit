/** Bezpieczne parsowanie JSON z odpowiedzi `fetch` (dowolny kształt). */
export async function parseJsonUnknown(res: Response): Promise<unknown | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Typowy kształt błędu API: `{ error: string }`. */
export function readApiErrorString(body: unknown): string | undefined {
  if (body === null || typeof body !== "object") return undefined;
  const err = (body as { error?: unknown }).error;
  return typeof err === "string" ? err : undefined;
}
