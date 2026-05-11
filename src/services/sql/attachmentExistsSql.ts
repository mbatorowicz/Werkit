import { sql } from "drizzle-orm";
import { sessionNotes, sessionPhotos, workOrders, workSessions } from "@/db/schema";

/** EXISTS: zlecenie ma co najmniej jedno zdjęcie z dowolnej sesji tego zlecenia. */
export function sqlWorkOrderHasPhotos() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${sessionPhotos}
    INNER JOIN ${workSessions} ON ${workSessions.id} = ${sessionPhotos.workSessionId}
    WHERE ${workSessions.workOrderId} = ${workOrders.id}
  )`;
}

/** EXISTS: zlecenie ma co najmniej jedną notatkę z dowolnej sesji tego zlecenia. */
export function sqlWorkOrderHasNotes() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${sessionNotes}
    INNER JOIN ${workSessions} ON ${workSessions.id} = ${sessionNotes.workSessionId}
    WHERE ${workSessions.workOrderId} = ${workOrders.id}
  )`;
}

/** EXISTS: sesja robocza ma co najmniej jedno zdjęcie. */
export function sqlSessionHasPhotos() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${sessionPhotos}
    WHERE ${sessionPhotos.workSessionId} = ${workSessions.id}
  )`;
}

/** EXISTS: sesja robocza ma co najmniej jedną notatkę. */
export function sqlSessionHasNotes() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${sessionNotes}
    WHERE ${sessionNotes.workSessionId} = ${workSessions.id}
  )`;
}
