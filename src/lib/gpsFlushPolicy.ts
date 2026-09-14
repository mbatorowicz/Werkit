/** 403 albo `feature_disabled` — nie retry’ować, opróżnić kolejkę GPS. */
export function shouldAbandonGpsQueue(status: number, errorCode?: string): boolean {
  return status === 403 || errorCode === "feature_disabled";
}

export async function readGpsFlushErrorCode(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.clone().json()) as { error?: unknown };
    return typeof j.error === "string" ? j.error : undefined;
  } catch {
    return undefined;
  }
}
