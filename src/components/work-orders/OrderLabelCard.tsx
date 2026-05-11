type Tone = "planned" | "active" | "done";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "planned":
      return {
        pill: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        label: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-500/20",
        bar: "bg-amber-500/90 dark:bg-amber-400/90",
      };
    case "active":
      return {
        pill: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        label: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-500/20",
        bar: "bg-blue-500/90 dark:bg-blue-400/90",
      };
    case "done":
    default:
      return {
        pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        label: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-500/20",
        bar: "bg-emerald-500/90 dark:bg-emerald-400/90",
      };
  }
}

function LabelItem({
  k,
  v,
  title,
}: {
  k: string;
  v: string;
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">{k}</div>
      <div className="text-zinc-900 dark:text-zinc-100 text-[15px] font-semibold truncate" title={title}>
        {v}
      </div>
    </div>
  );
}

export function OrderLabelCard({
  tone,
  orderNo,
  title,
  badges,
  mode,
  machine,
  material,
  quantity,
  customer,
  description,
  dateLabel,
  timeLabel,
  className = "",
}: {
  tone: Tone;
  orderNo: string;
  title?: string | null;
  badges?: React.ReactNode;
  mode: string;
  machine: string;
  material?: string | null;
  quantity?: string | null;
  customer?: string | null;
  description?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  className?: string;
}) {
  const cls = toneClasses(tone);
  const defaultLabels = {
    mode: "Tryb pracy",
    machine: "Maszyna",
    material: "Materiał",
    quantity: "Ilość",
    customer: "Klient",
    description: "Opis",
    date: "Data",
    time: "Godzina",
  } as const;
  const labels = defaultLabels;

  return (
    <div
      className={`rounded-xl border ${cls.border} bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex">
        {/* Pasek statusu (pełna wysokość wiersza) */}
        <div className={`w-1.5 shrink-0 ${cls.bar}`} />

        <div className="flex-1 p-3">
          {/* Nr zlecenia — jedyny element w kolorze statusu */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className={`font-mono text-sm font-black ${cls.label}`}>{orderNo}</div>
              {title?.trim() ? (
                <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {title}
                </div>
              ) : null}
            </div>
            {badges ? <div className="shrink-0 flex items-center gap-2">{badges}</div> : null}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <LabelItem k={labels.mode} v={mode || "—"} />
            <LabelItem k={labels.machine} v={machine || "—"} />
            <LabelItem k={labels.material} v={material?.trim() ? material : "—"} />
            <LabelItem k={labels.quantity} v={quantity?.trim() ? quantity : "—"} />
            <LabelItem k={labels.customer} v={customer?.trim() ? customer : "—"} />
            <LabelItem k={labels.description} v={description?.trim() ? description : "—"} title={description ?? undefined} />
            <LabelItem k={labels.date} v={dateLabel?.trim() ? dateLabel : "—"} />
            <LabelItem k={labels.time} v={timeLabel?.trim() ? timeLabel : "—"} />
          </div>
        </div>
      </div>
    </div>
  );
}

