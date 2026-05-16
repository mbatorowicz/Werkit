import type { ReactNode } from "react";

type Props = {
  label: string;
  children?: ReactNode;
  value?: string | number | null;
};

export function AdminPreviewField({ label, children, value }: Props) {
  const content = children ?? (value != null && String(value).trim() !== "" ? String(value) : "—");
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{content}</dd>
    </div>
  );
}
