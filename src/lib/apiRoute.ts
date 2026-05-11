"use server";

import { NextResponse } from "next/server";

export type ApiErrorCode = string;

export class ApiRouteError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly exposeDetails: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    status: number,
    opts?: { details?: Record<string, unknown>; exposeDetails?: boolean; cause?: unknown },
  ) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = opts?.details;
    this.exposeDetails = Boolean(opts?.exposeDetails);
    if (opts?.cause) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TS < 5.6 compatibility
      (this as any).cause = opts.cause;
    }
  }
}

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status ?? 200 });
}

export function jsonError(
  code: ApiErrorCode,
  status: number,
  opts?: { details?: Record<string, unknown> },
) {
  return NextResponse.json({ error: code, ...(opts?.details ?? {}) }, { status });
}

/** Odpowiedź z `Content-Disposition: attachment` (JSON jako plik). */
export function jsonFileAttachment(filename: string, jsonBody: string) {
  return new NextResponse(jsonBody, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function throwApiError(code: ApiErrorCode, status: number, details?: Record<string, unknown>): never {
  throw new ApiRouteError(code, status, { details, exposeDetails: Boolean(details) });
}

export async function parseJsonBody<T extends Record<string, unknown> = Record<string, unknown>>(
  request: Request,
): Promise<T> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throwApiError("invalid_json", 400);
  }
  try {
    const body: unknown = await request.json();
    if (body === null || typeof body !== "object") {
      throwApiError("invalid_json", 400);
    }
    return body as T;
  } catch (cause) {
    throw new ApiRouteError("invalid_json", 400, { cause });
  }
}

/** Parsuje JSON jako `unknown` (pozwala na tablice) — do endpointów typu GPS sync. */
export async function parseJson(request: Request): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throwApiError("invalid_json", 400);
  }
  try {
    return await request.json();
  } catch (cause) {
    throw new ApiRouteError("invalid_json", 400, { cause });
  }
}

export async function parseJsonBodyOrEmpty(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    return await parseJsonBody(request);
  } catch {
    return {};
  }
}

type RouteHandler<TCtx = unknown> = (request: Request, ctx: TCtx) => Promise<Response>;

export function withApiErrorHandling<TCtx = unknown>(
  handler: RouteHandler<TCtx>,
  opts?: {
    /**
     * Pozwala zamapować „obce” wyjątki na konkretną odpowiedź
     * (np. brak tabel po migracji → 503).
     */
    mapUnknownError?: (err: unknown) => Response | null;
    /** Domyślny kod błędu dla 500. */
    defaultErrorCode?: ApiErrorCode;
  },
): RouteHandler<TCtx> {
  return async (request: Request, ctx: TCtx) => {
    try {
      return await handler(request, ctx);
    } catch (err: unknown) {
      if (err instanceof ApiRouteError) {
        if (err.exposeDetails && err.details) return jsonError(err.code, err.status, { details: err.details });
        return jsonError(err.code, err.status);
      }
      const mapped = opts?.mapUnknownError?.(err);
      if (mapped) return mapped;
      return jsonError(opts?.defaultErrorCode ?? "internal_error", 500);
    }
  };
}

