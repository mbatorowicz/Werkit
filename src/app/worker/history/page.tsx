import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { narrowOrderType } from "@/lib/orderType";
import type { WorkerHistoryListSession } from "@/features/worker/components/WorkerHistoryList";
import { JWT_SECRET } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { WorkerHistoryList } from "@/features/worker/components/WorkerHistoryList";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function getUserId() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const dict = getDictionary(await getServerLocale());
  const h = dict.worker.history;
  const workerClient = dict.worker.client;

  const userId = await getUserId();
  if (!userId) return <div>{h.accessDenied}</div>;

  const companyId = await requireServerCompanyId();
  const { WorkerSessionService } = await import("@/services/WorkerSessionService");
  const sessions = await WorkerSessionService.getCompletedSessions(userId, companyId);

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">{h.listTitle}</h1>

      {sessions.length === 0 ? (
        <div className="text-center p-8 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <p className="text-zinc-500 text-sm">{h.listEmpty}</p>
        </div>
      ) : (
        <WorkerHistoryList
          sessions={sessions.map(
            (s): WorkerHistoryListSession => ({
              id: s.id,
              workOrderId: s.workOrderId,
              categoryName: s.categoryName ?? null,
              categoryColor: s.categoryColor,
              categoryShowMaterial: s.categoryShowMaterial,
              categoryShowCustomer: s.categoryShowCustomer,
              categoryShowQuantity: s.categoryShowQuantity,
              categoryShowTaskDescription: s.categoryShowTaskDescription,
              startTime:
                s.startTime instanceof Date ? s.startTime.toISOString() : String(s.startTime),
              endTime: s.endTime
                ? s.endTime instanceof Date
                  ? s.endTime.toISOString()
                  : String(s.endTime)
                : null,
              taskDescription: s.taskDescription,
              repairDescription: s.repairDescription,
              orderType: narrowOrderType(s.orderType),
              resourceName: s.resourceName,
              materialName: s.materialName,
              quantityTons:
                s.quantityTons != null && s.quantityTons !== "" ? Number(s.quantityTons) : null,
              customerFirstName: s.customerFirstName,
              customerLastName: s.customerLastName,
              customerPhone: s.customerPhone,
              customerAddress: s.customerAddress,
              hasPhotos: s.hasPhotos,
              hasNotes: s.hasNotes,
            })
          )}
          historyLabels={h}
          workerClient={workerClient}
        />
      )}
    </div>
  );
}
