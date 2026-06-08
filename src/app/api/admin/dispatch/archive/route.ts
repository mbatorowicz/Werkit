import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { AdminDispatchService } from "@/services/AdminDispatchService";
import { requireCompanyScopedSession } from "@/lib/apiTenant";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

function parsePagination(url: string): { limit: number; offset: number } {
  const params = new URL(url).searchParams;
  const rawLimit = parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const rawOffset = parseInt(params.get("offset") ?? "0", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
  return { limit, offset };
}

/** GET /api/admin/dispatch/archive — zakończone sesje (lazy-load archiwum). */
export const GET = withApiErrorHandling(
  async (request: Request) => {
    const scoped = await requireCompanyScopedSession();
    if (!scoped.ok) return scoped.response;

    const { limit, offset } = parsePagination(request.url);
    const data = await AdminDispatchService.getArchiveSessions(
      scoped.data.companyId,
      limit,
      offset
    );
    return jsonOk(data);
  },
  { defaultErrorCode: "fetch_error" }
);
