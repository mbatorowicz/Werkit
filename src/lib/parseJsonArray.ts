/** Bezpieczne parsowanie odpowiedzi API jako tablicy (listy z fetch). */
export async function parseJsonArray(res: Response): Promise<unknown[]> {
  if (!res.ok) return [];
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return [];
  try {
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
