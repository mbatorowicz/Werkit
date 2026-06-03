import type { KeyboardEvent } from "react";
import { Camera, FileText } from "lucide-react";
import { CategoryColorCardBadge } from "@/components/CategoryColorBadge";
import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import { getDictionary } from "@/i18n";
import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";
import { CustomerContactFields } from "@/components/customers/CustomerContactFields";
import {
  buildOrderLabelCustomerDisplay,
  type OrderLabelCustomerDisplay,
} from "@/lib/orderLabelCustomerDisplay";
import { UI_RADIUS_CARD } from "@/lib/uiRadius";

type Tone = "planned" | "active" | "done";
type Density = "normal" | "compact";
type Layout = "full" | "teaser";

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

export function OrderLabelCard({
  tone,
  orderNo,
  title,
  badges,
  footer,
  subheader,
  orderedBy,
  orderedByLabel,
  density = "normal",
  layout = "full",
  showDateTime = true,
  mode,
  modeColor,
  machine,
  material,
  quantity,
  customer,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerAddress,
  customerDisplay: customerDisplayProp,
  description,
  dateLabel,
  timeLabel,
  attachmentPhotos,
  attachmentNotes,
  fieldVisibility,
  onCategoryClick,
  categoryBadgeAriaLabel,
  onCardClick,
  cardAriaLabel,
  className = "",
}: {
  tone: Tone;
  orderNo: string;
  title?: string | null;
  badges?: React.ReactNode;
  footer?: React.ReactNode;
  subheader?: React.ReactNode;
  orderedBy?: string | null;
  orderedByLabel?: string;
  density?: Density;
  /** `teaser` — nagłówek i zajawka; pełna siatka pól w `full` (domyślnie). */
  layout?: Layout;
  showDateTime?: boolean;
  attachmentPhotos?: boolean;
  attachmentNotes?: boolean;
  mode: string;
  modeColor?: string | null;
  machine: string;
  material?: string | null;
  quantity?: string | null;
  customerDisplay?: OrderLabelCustomerDisplay;
  customer?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  description?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  fieldVisibility?: OrderLabelFieldVisibility;
  onCategoryClick?: () => void;
  categoryBadgeAriaLabel?: string;
  /** Klik w kartę (główny ekran workera) — otwiera modal szczegółów. */
  onCardClick?: () => void;
  cardAriaLabel?: string;
  className?: string;
}) {
  const cls = toneClasses(tone);
  const isCompact = density === "compact";
  const isTeaser = layout === "teaser";
  const isClickable = isTeaser && Boolean(onCardClick);
  const attachDict = getDictionary().worker.client;
  const fieldLabels = getDictionary().admin.orderFields;
  const customerDict = getDictionary().admin.customers;
  const customerDisplay =
    customerDisplayProp ??
    buildOrderLabelCustomerDisplay({
      customerName: customer,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerAddress,
    });
  const customerContactLabels = {
    customer: fieldLabels.customer,
    streetLabel: customerDict.streetLabel,
    postalCodeLabel: customerDict.postalCodeLabel,
    cityLabel: customerDict.cityLabel,
    phoneLabel: customerDict.phoneLabel,
  };
  const vis = fieldVisibility ?? {
    showMode: true,
    showMaterial: true,
    showQuantity: true,
    showCustomer: true,
    showDescription: true,
    descriptionLabel: fieldLabels.description,
  };
  const labels = {
    machine: fieldLabels.resource,
    material: fieldLabels.material,
    quantity: fieldLabels.quantity,
    description: vis.descriptionLabel,
    date: fieldLabels.date,
    time: fieldLabels.time,
  };
  const orderedByText = orderedByLabel ?? fieldLabels.orderedBy;

  const categoryClick = isClickable ? undefined : onCategoryClick;
  const dateTimeTeaser = [dateLabel?.trim(), timeLabel?.trim()].filter(Boolean).join(" · ");

  const body = (
    <div className="flex min-w-0">
      <div className={`w-1.5 shrink-0 ${cls.bar}`} />

      <div className={`flex-1 min-w-0 ${isCompact ? "p-2.5" : "p-3"}`}>
        <div
          className={`flex items-start justify-between gap-3 ${isCompact ? "mb-1.5" : "mb-2"}`}
        >
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
                    <Camera className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`} aria-hidden />
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

        {vis.showMode && mode?.trim() ? (
          <div className={`flex items-center min-w-0 ${isCompact ? "mb-1.5" : "mb-2"}`}>
            <CategoryColorCardBadge
              label={mode}
              color={modeColor}
              onClick={categoryClick}
              ariaLabel={categoryBadgeAriaLabel}
            />
          </div>
        ) : null}

        {isTeaser ? (
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {machine?.trim() || "—"}
            </p>
            {vis.showCustomer && customerDisplay.customerName ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                {customerDisplay.customerName}
              </p>
            ) : null}
            {vis.showMaterial && material?.trim() ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">{material}</p>
            ) : null}
            {showDateTime && dateTimeTeaser ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{dateTimeTeaser}</p>
            ) : null}
            {isClickable ? (
              <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 pt-0.5">
                {attachDict.orderDetailsTeaserHint}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-1 ${
                isCompact ? "gap-y-1.5" : "gap-x-4 gap-y-2 sm:grid-cols-2"
              }`}
            >
              <OrderDetailField label={labels.machine} value={machine || "—"} />
              {vis.showMaterial ? (
                <OrderDetailField
                  label={labels.material}
                  value={material?.trim() ? material : "—"}
                />
              ) : null}
              {vis.showQuantity ? (
                <OrderDetailField
                  label={labels.quantity}
                  value={quantity?.trim() ? quantity : "—"}
                />
              ) : null}
              {vis.showCustomer ? (
                <CustomerContactFields
                  variant="order"
                  labels={customerContactLabels}
                  customerName={customerDisplay.customerName}
                  phone={customerDisplay.customerPhone}
                  addressParts={customerDisplay.addressParts}
                />
              ) : null}
              {vis.showDescription && description?.trim() ? (
                <OrderDetailField
                  label={labels.description}
                  value={description}
                  multiline
                  className={isCompact ? undefined : "sm:col-span-2"}
                />
              ) : null}
              {showDateTime ? (
                <OrderDetailField
                  label={labels.date}
                  value={dateLabel?.trim() ? dateLabel : "—"}
                />
              ) : null}
              {showDateTime ? (
                <OrderDetailField
                  label={labels.time}
                  value={timeLabel?.trim() ? timeLabel : "—"}
                />
              ) : null}
            </div>

            {orderedBy?.trim() ? (
              <div className={isCompact ? "mt-2" : "mt-3"}>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {orderedByText}{" "}
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">{orderedBy}</span>
                </div>
              </div>
            ) : null}
          </>
        )}

        {footer ? <div className={isCompact ? "mt-2" : "mt-3"}>{footer}</div> : null}
      </div>
    </div>
  );

  const shellClass =
    `${UI_RADIUS_CARD} border ${cls.border} bg-white dark:bg-zinc-900 shadow-sm overflow-hidden ${className}` +
    (isClickable
      ? " w-full text-left cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99]"
      : "");

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick();
    }
  };

  if (isClickable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label={cardAriaLabel ?? attachDict.orderDetailsOpenCategory}
        className={shellClass}
      >
        {body}
      </div>
    );
  }

  return <div className={shellClass}>{body}</div>;
}
