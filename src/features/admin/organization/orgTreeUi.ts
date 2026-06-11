export function expandKey(kind: "dept" | "team" | "unassigned", id: number) {
  return `${kind}-${id}`;
}

export const ORG_TREE_ROW_CLASS =
  "group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900";
