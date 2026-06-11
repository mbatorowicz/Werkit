import { foldMicroJumpsInPath } from "@/lib/gps";
import type { WorkerRouteAction } from "@/features/worker/gps/workerRouteReducer";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { sendRemoteLog } from "@/lib/remoteLogger";
import { buildWorkerSessionTimeline } from "@/features/worker/lib/workerSessionTimeline";
import type {
  AppSettings,
  Coord,
  Session,
  TimelineItem,
  UserData,
  WorkOrder,
} from "@/types/worker";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { narrowWorkOrders } from "@/lib/narrowApiListRows";
import {
  narrowAppSettings,
  narrowGpsPathLogs,
  narrowNominatimHits,
  narrowSession,
  narrowUserData,
} from "@/features/worker/lib/narrowWorkerClientPayload";

export type WorkerShellSessionLoadCtx = {
  destinationRef: { current: Coord | null };
  dispatchRoute: (action: WorkerRouteAction) => void;
  setWorkOrders: (v: WorkOrder[]) => void;
  setSession: (v: Session | null) => void;
  setTimelineEvents: (v: TimelineItem[]) => void;
  setSettings: (v: AppSettings) => void;
  setCurrentUser: (v: UserData) => void;
  setDestination: (v: Coord | null) => void;
  setRouteWaypoints: (v: Coord[]) => void;
  setCustomerLocationId: (v: number | null) => void;
  setDistanceToDestKm: (v: number | null) => void;
};

async function loadGpsPathIntoRoute(ctx: WorkerShellSessionLoadCtx): Promise<void> {
  try {
    const resPath = await fetchWithDeviceTelemetry(
      "Worker: gps path GET",
      "/api/worker/gps",
      {
        cache: "no-store",
      },
      { category: "gps" }
    );
    const pathBody = await parseJsonUnknown(resPath);
    const logs = narrowGpsPathLogs(pathBody);
    if (logs.length > 0) {
      const folded = foldMicroJumpsInPath(logs);
      ctx.dispatchRoute({ type: "reset", path: folded });
    }
  } catch {
    /* ścieżka GPS opcjonalna */
  }
}

async function applySessionDestination(s: Session, ctx: WorkerShellSessionLoadCtx): Promise<void> {
  ctx.setRouteWaypoints(Array.isArray(s.routeWaypoints) ? s.routeWaypoints : []);
  ctx.setCustomerLocationId(typeof s.customerLocationId === "number" ? s.customerLocationId : null);
  if (s.customerLat && s.customerLng) {
    ctx.setDestination({ lat: parseFloat(s.customerLat), lng: parseFloat(s.customerLng) });
  } else if (s.customerAddress && !ctx.destinationRef.current) {
    try {
      const geo = await fetchWithDeviceTelemetry(
        "Worker: Nominatim geocode",
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(s.customerAddress)}`,
        undefined,
        { category: "http" }
      );
      const geoRows = await parseJsonArray(geo);
      const hits = narrowNominatimHits(geoRows);
      if (hits.length > 0) {
        ctx.setDestination({ lat: parseFloat(hits[0].lat), lng: parseFloat(hits[0].lon) });
      }
    } catch {
      /* geokodowanie opcjonalne */
    }
  }
}

export async function loadWorkerSessionAndPath(
  fetchGpsPath: boolean,
  ctx: WorkerShellSessionLoadCtx
): Promise<void> {
  try {
    const [resSess, resOrders] = await Promise.all([
      fetchWithDeviceTelemetry(
        "Worker: session GET",
        "/api/worker/session",
        { cache: "no-store" },
        {
          category: "session",
        }
      ),
      fetchWithDeviceTelemetry(
        "Worker: work-orders GET",
        "/api/worker/work-orders",
        { cache: "no-store" },
        {
          category: "orders",
        }
      ),
    ]);

    if (!resSess.ok) throw new Error(`Session fetch failed: ${resSess.status}`);
    if (!resOrders.ok) throw new Error(`Orders fetch failed: ${resOrders.status}`);

    const sessRaw = await parseJsonUnknown(resSess);
    const ordersRows = await parseJsonArray(resOrders);
    ctx.setWorkOrders(narrowWorkOrders(ordersRows));

    const sessData: Record<string, unknown> =
      sessRaw !== null && typeof sessRaw === "object" && !Array.isArray(sessRaw)
        ? (sessRaw as Record<string, unknown>)
        : {};

    const sessionRowEarly = narrowSession(sessData.session);
    const stationary = Boolean(sessionRowEarly?.categoryIsStationary);
    if (stationary) {
      ctx.dispatchRoute({ type: "reset", path: [] });
      ctx.setDestination(null);
      ctx.setDistanceToDestKm(null);
    }

    if (fetchGpsPath && sessionRowEarly && !stationary) {
      await loadGpsPathIntoRoute(ctx);
    }

    if ("settings" in sessData) {
      const settingsParsed = narrowAppSettings(sessData.settings);
      if (settingsParsed !== null) ctx.setSettings(settingsParsed);
    }
    if ("user" in sessData) {
      const userParsed = narrowUserData(sessData.user);
      if (userParsed !== null) ctx.setCurrentUser(userParsed);
    }

    if (sessionRowEarly) {
      ctx.setSession(sessionRowEarly);
      ctx.setTimelineEvents(buildWorkerSessionTimeline(sessData.events, sessData.notes));

      const sessStationary = Boolean(sessionRowEarly.categoryIsStationary);
      if (!sessStationary) {
        await applySessionDestination(sessionRowEarly, ctx);
      }
    } else {
      ctx.setSession(null);
      ctx.setDestination(null);
      ctx.setRouteWaypoints([]);
      ctx.setCustomerLocationId(null);
      ctx.setDistanceToDestKm(null);
    }
  } catch (e) {
    void sendRemoteLog(
      "ERROR",
      "WorkerClient fetchSessionAndPath",
      {
        error: e instanceof Error ? e.message : String(e),
      },
      { category: "session" }
    );
  }
}
