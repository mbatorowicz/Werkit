"use client";

export interface CatalogTreeNodeStatsProps {
  categoryStatLong: string | null;
  categoryStatShort: string | null;
  materialStat: string | null;
  materialCount: number;
}

export function CatalogTreeNodeStats({
  categoryStatLong,
  categoryStatShort,
  materialStat,
  materialCount,
}: CatalogTreeNodeStatsProps) {
  if (!categoryStatLong && !categoryStatShort && !materialStat) return null;

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 px-1 text-[11px] tabular-nums leading-tight text-zinc-500 sm:gap-3 sm:text-xs">
      {categoryStatShort ? (
        <span className="sm:hidden" title={categoryStatLong ?? categoryStatShort}>
          {categoryStatShort}
        </span>
      ) : null}
      {categoryStatLong ? (
        <span className="hidden max-w-[9rem] truncate sm:inline" title={categoryStatLong}>
          {categoryStatLong}
        </span>
      ) : null}
      {materialStat ? (
        <span
          className={
            materialCount > 0
              ? "font-medium text-amber-800/90 dark:text-amber-300/90"
              : "text-zinc-400 dark:text-zinc-500"
          }
        >
          {materialStat}
        </span>
      ) : null}
    </div>
  );
}
