import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";

export async function handleDeleteWorkOrder(
  orderId: number,
  appAlert: (opts: { message: string }) => Promise<void>,
  apiErrors: Record<string, string>,
  dict: { error: string; mutationOk: string },
  fetchData: (force?: boolean) => void,
): Promise<void> {
  const res = await fetchWithDeviceTelemetry(
    `Admin orders: delete work-order ${orderId}`,
    `/api/admin/work-orders/${orderId}`,
    { method: "DELETE" },
    { category: "admin" },
  );
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    const code = readApiErrorString(body);
    const message = code ? (apiErrors[code] ?? code) : dict.error;
    await appAlert({ message });
    throw new Error(code ?? "delete_failed");
  }
  await appAlert({ message: dict.mutationOk });
  fetchData(true);
}

export async function handleForceCompleteSession(
  sessionId: number,
  appAlert: (opts: { message: string }) => Promise<void>,
  apiErrors: Record<string, string>,
  dict: { error: string; mutationOk: string },
  closeSessionDetails: () => void,
  fetchData: (force?: boolean) => void,
): Promise<void> {
  const res = await fetchWithDeviceTelemetry(
    `Admin sessions: force-complete ${sessionId}`,
    `/api/admin/work-sessions/${sessionId}/force-complete`,
    { method: "POST" },
    { category: "admin" },
  );
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    const code = readApiErrorString(body);
    const message = code ? (apiErrors[code] ?? code) : dict.error;
    await appAlert({ message });
    throw new Error(code ?? "complete_failed");
  }
  await appAlert({ message: dict.mutationOk });
  closeSessionDetails();
  fetchData(true);
}

export async function handleDeleteArchivedSession(
  sessionId: number,
  adminPassword: string,
  appAlert: (opts: { message: string }) => Promise<void>,
  apiErrors: Record<string, string>,
  dict: { mutationOk: string },
  closeSessionDetails: () => void,
  fetchData: (force?: boolean) => void,
): Promise<void> {
  const res = await fetchWithDeviceTelemetry(
    `Admin sessions: delete archived ${sessionId}`,
    `/api/admin/work-sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    },
    { category: "admin" },
  );
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    const code = readApiErrorString(body);
    throw new Error(code ?? "delete_failed");
  }
  await appAlert({ message: dict.mutationOk });
  closeSessionDetails();
  fetchData(true);
}
