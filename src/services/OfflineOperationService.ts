import { coordsFromRequestBody } from "@/lib/coordsFromRequestBody";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  offlineOperations,
  workSessions,
  workOrders,
  sessionNotes,
  sessionPhotos,
} from "@/db/schema";
import { assertSessionNoteLength } from "@/lib/sessionNoteLimits";
import { WorkSessionMaterialService } from "@/services/materials/WorkSessionMaterialService";

export class OfflineOperationService {
  static async execute(userId: number, companyId: number, input: Record<string, unknown>) {
    const { operationId, type, payload } = input;
    if (
      typeof operationId !== "string" ||
      !/^[a-zA-Z0-9_-]{10,100}$/.test(operationId) ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    )
      throw new Error("invalid_payload");
    const p = payload as Record<string, unknown>;
    if (!Number.isInteger(p.sessionId) || Number(p.sessionId) < 1)
      throw new Error("invalid_payload");
    const loc =
      p.location && typeof p.location === "object" ? (p.location as Record<string, unknown>) : null;
    const coord = coordsFromRequestBody(loc ? { latitude: loc.lat, longitude: loc.lng } : p);
    const coordinates = coord ? { latitude: String(coord.lat), longitude: String(coord.lng) } : {};
    const hash = createHash("sha256").update(JSON.stringify({ type, payload })).digest("hex");
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${operationId}, 0))`);
      const [receipt] = await tx
        .select()
        .from(offlineOperations)
        .where(eq(offlineOperations.id, operationId));
      if (receipt) {
        if (
          receipt.userId !== userId ||
          receipt.companyId !== companyId ||
          receipt.requestHash !== hash
        )
          throw new Error("offline_conflict");
        return { success: true, replayed: true };
      }
      const [session] = await tx
        .select()
        .from(workSessions)
        .where(
          and(
            eq(workSessions.id, Number(p.sessionId)),
            eq(workSessions.userId, userId),
            eq(workSessions.companyId, companyId)
          )
        )
        .for("update");
      if (!session || session.status !== "IN_PROGRESS") throw new Error("offline_conflict");
      if (type === "save_note" || type === "checkpoint" || type === "edit_note") {
        if (typeof p.note !== "string" || !p.note.trim()) throw new Error("invalid_payload");
        assertSessionNoteLength(p.note);
        if (type === "edit_note") {
          if (!Number.isInteger(p.noteId)) throw new Error("invalid_payload");
          const rows = await tx
            .update(sessionNotes)
            .set({ note: p.note })
            .where(
              and(eq(sessionNotes.id, Number(p.noteId)), eq(sessionNotes.workSessionId, session.id))
            )
            .returning({ id: sessionNotes.id });
          if (!rows.length) throw new Error("offline_conflict");
        } else
          await tx
            .insert(sessionNotes)
            .values({ workSessionId: session.id, note: p.note, ...coordinates });
      } else if (type === "end_session") {
        const end = new Date(typeof p.occurredAt === "string" ? p.occurredAt : "");
        if (
          !Number.isFinite(end.getTime()) ||
          end < session.startTime ||
          end.getTime() > Date.now() + 60_000
        )
          throw new Error("invalid_payload");
        await tx
          .update(workSessions)
          .set({
            status: "COMPLETED",
            endTime: end,
            ...(coord ? { endLatitude: String(coord.lat), endLongitude: String(coord.lng) } : {}),
          })
          .where(eq(workSessions.id, session.id));
        if (session.workOrderId)
          await tx
            .update(workOrders)
            .set({ status: "COMPLETED" })
            .where(eq(workOrders.id, session.workOrderId));
      } else if (type === "cancel_session") {
        await WorkSessionMaterialService.returnForSessionIfIssued(
          companyId,
          userId,
          session.id,
          tx
        );
        if (session.workOrderId)
          await tx
            .update(workOrders)
            .set({ status: "PENDING" })
            .where(eq(workOrders.id, session.workOrderId));
        await tx.delete(workSessions).where(eq(workSessions.id, session.id));
      } else if (type === "upload_photo") {
        if (typeof p.photoUrl !== "string") throw new Error("invalid_photo_data");
        const { uploadPhotoBase64 } = await import("@/lib/photoUpload");
        const photo = await uploadPhotoBase64(
          p.photoUrl,
          session.id,
          "AD_HOC",
          companyId,
          operationId
        );
        await tx.insert(sessionPhotos).values({
          workSessionId: session.id,
          photoUrl: photo.url,
          photoType: "AD_HOC",
          ...coordinates,
        });
      } else throw new Error("invalid_payload");
      await tx
        .insert(offlineOperations)
        .values({ id: operationId, userId, companyId, requestHash: hash });
      return { success: true, replayed: false };
    });
  }
}
