import { jsonError, jsonOk, parseJsonBody, withApiErrorHandling } from "@/lib/apiRoute";
import { parsePositiveIntParam } from '@/lib/parseRouteParams';
import { WorkerSessionService } from '@/services/WorkerSessionService';
import { requireWorkerCompanySession } from '@/lib/apiTenant';

export const POST = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);
    const note = typeof body.note === "string" ? body.note : "";
    const location = body.location as { lat?: unknown; lng?: unknown } | undefined;
    if (!note.trim()) return jsonError("missing_fields", 400);

    await WorkerSessionService.addNote(
      ctx.userId,
      ctx.companyId,
      note,
      location?.lat != null ? String(location.lat) : null,
      location?.lng != null ? String(location.lng) : null,
    );

    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => (err instanceof Error && err.message === "no_active_session" ? jsonError("no_active_session", 400) : null),
    defaultErrorCode: "save_error",
  },
);

export const PUT = withApiErrorHandling(
  async (request: Request) => {
    const ctx = await requireWorkerCompanySession();
    if (!ctx.ok) return ctx.response;

    const body = await parseJsonBody(request);
    const noteId = body.noteId;
    const note = typeof body.note === "string" ? body.note : "";
    if (!noteId || !note.trim()) return jsonError("missing_fields", 400);

    const nid = parsePositiveIntParam(noteId);
    if (nid == null) {
      return jsonError("invalid_id", 400);
    }

    await WorkerSessionService.updateNote(ctx.userId, ctx.companyId, nid, note);
    return jsonOk({ success: true });
  },
  {
    mapUnknownError: (err) => {
      if (err instanceof Error && err.message === "no_active_session") return jsonError("no_active_session", 400);
      if (err instanceof Error && err.message === "unauthorized_note") return jsonError("unauthorized_note", 404);
      return null;
    },
    defaultErrorCode: "save_error",
  },
);
