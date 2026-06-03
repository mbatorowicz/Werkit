/** Wspólny wiersz etykieta + wartość (karta zlecenia, modal szczegółów workera). */
export function OrderDetailField({
  label,
  value,
  multiline,
  className = "",
  valueNode,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  className?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[11px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      {valueNode ?? (
        <div
          className={
            multiline
              ? "mt-0.5 text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 break-words whitespace-pre-wrap"
              : "mt-0.5 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 truncate"
          }
          title={!multiline ? value : undefined}
        >
          {value}
        </div>
      )}
    </div>
  );
}
