type Tone = "planned" | "active" | "done";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "planned":
      return {
        pill: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        label: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-500/20",
      };
    case "active":
      return {
        pill: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        label: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-500/20",
      };
    case "done":
    default:
      return {
        pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        label: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-500/20",
      };
  }
}

function LabelItem({
  labelClass,
  k,
  v,
  title,
}: {
  labelClass: string;
  k: string;
  v: string;
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <span className={`uppercase tracking-wider font-semibold text-[10px] ${labelClass}`}>{k}</span>
      <div className="text-zinc-800 dark:text-zinc-200 text-sm truncate" title={title}>
        {v}
      </div>
    </div>
  );
}

export function OrderLabelCard({
  tone,
  orderNo,
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

  return (
    <div className={`rounded-xl border ${cls.border} bg-white dark:bg-zinc-900 p-3 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`font-mono text-sm font-black px-2 py-0.5 rounded border ${cls.pill}`}>{orderNo}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <LabelItem labelClass={cls.label} k="Tryb pracy" v={mode || "—"} />
        <LabelItem labelClass={cls.label} k="Maszyna" v={machine || "—"} />
        <LabelItem labelClass={cls.label} k="Materiał" v={material?.trim() ? material : "—"} />
        <LabelItem labelClass={cls.label} k="Ilość" v={quantity?.trim() ? quantity : "—"} />
        <LabelItem labelClass={cls.label} k="Klient" v={customer?.trim() ? customer : "—"} />
        <LabelItem
          labelClass={cls.label}
          k="Opis"
          v={description?.trim() ? description : "—"}
          title={description ?? undefined}
        />
        <LabelItem labelClass={cls.label} k="Data" v={dateLabel?.trim() ? dateLabel : "—"} />
        <LabelItem labelClass={cls.label} k="Godzina" v={timeLabel?.trim() ? timeLabel : "—"} />
      </div>
    </div>
  );
}

