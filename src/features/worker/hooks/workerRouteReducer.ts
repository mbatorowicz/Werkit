import type { Coord } from "@/types/worker";
import { foldAppendGpsSample, sumPathLengthKm } from "@/lib/gpsPathMicroJumps";

export type WorkerRouteState = { path: Coord[]; km: number };

export type WorkerRouteAction = { type: "reset"; path: Coord[] } | { type: "gps"; loc: Coord };

export function workerRouteReducer(state: WorkerRouteState, action: WorkerRouteAction): WorkerRouteState {
  if (action.type === "reset") {
    return { path: action.path, km: sumPathLengthKm(action.path) };
  }
  const { path, addedKm } = foldAppendGpsSample(state.path, action.loc);
  return { path, km: state.km + addedKm };
}
