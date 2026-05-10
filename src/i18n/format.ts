/**
 * Zamienia placeholdery `{klucz}` w łańcuchach ze słownika (np. orderFastReq, geofenceConfirm).
 */
export function formatDict(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}
