import { Camera, FileText } from "lucide-react";
import { getDictionary } from "@/i18n";

type Tone = "planned" | "active" | "done";
type Density = "normal" | "compact";

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
  footer,
  subheader,
  orderedBy,
  orderedByLabel = "Zlecił:",
  density = "normal",
  showDateTime = true,
  mode,
  machine,
  material,
  quantity,
  customer,
  description,
  dateLabel,
  timeLabel,
  /** Ikony załączników z realizacji zlecenia (sesja: zdjęcia / notatki). */
  attachmentPhotos,
  attachmentNotes,
  className = "",
}: {
  tone: Tone;
  orderNo: string;
  title?: string | null;
  badges?: React.ReactNode;
  footer?: React.ReactNode;
  subheader?: React.ReactNode;
  /** Kto zlecił (szary tekst w środku kafelka). */
  orderedBy?: string | null;
  orderedByLabel?: string;
  density?: Density;
  showDateTime?: boolean;
  attachmentPhotos?: boolean;
  attachmentNotes?: boolean;
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
  const isCompact = density === "compact";
  const attachDict = getDictionary().worker.client;
  const defaultLabels = {
    mode: "Tryb pracy",
    machine: "Zasób",
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

        <div className={`flex-1 ${isCompact ? "p-2.5" : "p-3"}`}>
          {/* Nr zlecenia — jedyny element w kolorze statusu */}
          <div className={`flex items-start justify-between gap-3 ${isCompact ? "mb-1.5" : "mb-2"}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`font-mono text-sm font-black ${cls.label}`}>{orderNo}</div>
                {title?.trim() ? (
                  <div className={`text-sm font-black truncate ${cls.label}`}>{title}</div>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {(attachmentPhotos || attachmentNotes) && (
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mr-1">
                  {attachmentPhotos ? (
                    <span title={attachDict.orderAttachmentPhotosTitle}>
                      <Camera
                        className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                        aria-hidden
                      />
                    </span>
                  ) : null}
                  {attachmentNotes ? (
                    <span title={attachDict.orderAttachmentNotesTitle}>
                      <FileText
                        className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                        aria-hidden
                      />
                    </span>
                  ) : null}
                </div>
              )}
              {badges ? badges : null}
            </div>
          </div>

          {subheader ? <div className={isCompact ? "mb-2" : "mb-3"}>{subheader}</div> : null}

          <div className={`grid grid-cols-2 ${isCompact ? "md:grid-cols-4 gap-x-4 gap-y-1.5" : "gap-x-4 gap-y-2"}`}>
            <LabelItem k={labels.mode} v={mode || "—"} />
            <LabelItem k={labels.machine} v={machine || "—"} />
            <LabelItem k={labels.material} v={material?.trim() ? material : "—"} />
            <LabelItem k={labels.quantity} v={quantity?.trim() ? quantity : "—"} />
            <LabelItem k={labels.customer} v={customer?.trim() ? customer : "—"} />
            <LabelItem k={labels.description} v={description?.trim() ? description : "—"} title={description ?? undefined} />
            {showDateTime ? <LabelItem k={labels.date} v={dateLabel?.trim() ? dateLabel : "—"} /> : null}
            {showDateTime ? <LabelItem k={labels.time} v={timeLabel?.trim() ? timeLabel : "—"} /> : null}
          </div>

          {orderedBy?.trim() ? (
            <div className={isCompact ? "mt-2" : "mt-3"}>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {orderedByLabel} <span className="font-medium text-zinc-600 dark:text-zinc-300">{orderedBy}</span>
              </div>
            </div>
          ) : null}

          {footer ? <div className={isCompact ? "mt-2" : "mt-3"}>{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

