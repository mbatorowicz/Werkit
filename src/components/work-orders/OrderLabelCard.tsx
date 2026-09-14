"use client";

import type { KeyboardEvent } from "react";
import { useDictionary } from "@/i18n";
import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";
import {
  buildOrderLabelCustomerDisplay,
  type OrderLabelCustomerDisplay,
} from "@/lib/orderLabelCustomerDisplay";
import { cn } from "@/lib/cn";
import { CARD } from "@/lib/uiTokens";
import { uiStatusToneClasses } from "@/lib/uiStatus";
import { OrderLabelCardBody } from "@/components/work-orders/OrderLabelCardBody";

type Tone = "planned" | "active" | "done";
type Density = "normal" | "compact";
type Layout = "full" | "teaser";

interface OrderLabelCardProps {
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
}: OrderLabelCardProps) {
  const cls = uiStatusToneClasses(tone);
  const isCompact = density === "compact";
  const isTeaser = layout === "teaser";
  const isClickable = isTeaser && Boolean(onCardClick);
  const dictionary = useDictionary();
  const attachDict = dictionary.worker.client;
  const fieldLabels = dictionary.admin.orderFields;
  const customerDict = dictionary.admin.customers;
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
    <OrderLabelCardBody
      barClass={cls.bar}
      labelClass={cls.label}
      isCompact={isCompact}
      isTeaser={isTeaser}
      isClickable={isClickable}
      orderNo={orderNo}
      title={title}
      attachmentPhotos={attachmentPhotos}
      attachmentNotes={attachmentNotes}
      photosTitle={attachDict.orderAttachmentPhotosTitle}
      notesTitle={attachDict.orderAttachmentNotesTitle}
      badges={badges}
      subheader={subheader}
      footer={footer}
      vis={vis}
      mode={mode}
      modeColor={modeColor}
      categoryClick={categoryClick}
      categoryBadgeAriaLabel={categoryBadgeAriaLabel}
      machine={machine}
      material={material}
      quantity={quantity}
      customerDisplay={customerDisplay}
      customerContactLabels={customerContactLabels}
      labels={labels}
      description={description}
      showDateTime={showDateTime}
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      dateTimeTeaser={dateTimeTeaser}
      teaserHint={attachDict.orderDetailsTeaserHint}
      orderedBy={orderedBy}
      orderedByText={orderedByText}
    />
  );

  const shellClass = cn(
    CARD,
    cls.border,
    "overflow-hidden",
    className,
    isClickable &&
      "w-full cursor-pointer text-left transition-colors hover:bg-zinc-50 active:scale-[0.99] dark:hover:bg-zinc-800/80"
  );

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
