"use client";

import { CategoryColorCardBadge } from "@/components/CategoryColorBadge";
import type { CustomerContactFieldLabels } from "@/components/customers/CustomerContactFields";
import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";
import type { OrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";
import { OrderLabelCardHeader } from "@/components/work-orders/OrderLabelCardHeader";
import { OrderLabelCardTeaser } from "@/components/work-orders/OrderLabelCardTeaser";
import {
  OrderLabelCardDetails,
  type OrderLabelCardDetailsLabels,
} from "@/components/work-orders/OrderLabelCardDetails";

export interface OrderLabelCardBodyProps {
  barClass: string;
  labelClass: string;
  isCompact: boolean;
  isTeaser: boolean;
  isClickable: boolean;
  orderNo: string;
  title?: string | null;
  attachmentPhotos?: boolean;
  attachmentNotes?: boolean;
  photosTitle: string;
  notesTitle: string;
  badges?: React.ReactNode;
  subheader?: React.ReactNode;
  footer?: React.ReactNode;
  vis: OrderLabelFieldVisibility;
  mode: string;
  modeColor?: string | null;
  categoryClick?: () => void;
  categoryBadgeAriaLabel?: string;
  machine: string;
  material?: string | null;
  quantity?: string | null;
  customerDisplay: OrderLabelCustomerDisplay;
  customerContactLabels: CustomerContactFieldLabels;
  labels: OrderLabelCardDetailsLabels;
  description?: string | null;
  showDateTime: boolean;
  dateLabel?: string | null;
  timeLabel?: string | null;
  dateTimeTeaser: string;
  teaserHint: string;
  orderedBy?: string | null;
  orderedByText: string;
}

export function OrderLabelCardBody({
  barClass,
  labelClass,
  isCompact,
  isTeaser,
  isClickable,
  orderNo,
  title,
  attachmentPhotos,
  attachmentNotes,
  photosTitle,
  notesTitle,
  badges,
  subheader,
  footer,
  vis,
  mode,
  modeColor,
  categoryClick,
  categoryBadgeAriaLabel,
  machine,
  material,
  quantity,
  customerDisplay,
  customerContactLabels,
  labels,
  description,
  showDateTime,
  dateLabel,
  timeLabel,
  dateTimeTeaser,
  teaserHint,
  orderedBy,
  orderedByText,
}: OrderLabelCardBodyProps) {
  return (
    <div className="flex min-w-0">
      <div className={`w-1.5 shrink-0 ${barClass}`} />

      <div className={`flex-1 min-w-0 ${isCompact ? "p-2.5" : "p-3"}`}>
        <OrderLabelCardHeader
          orderNo={orderNo}
          title={title}
          labelClass={labelClass}
          isCompact={isCompact}
          attachmentPhotos={attachmentPhotos}
          attachmentNotes={attachmentNotes}
          photosTitle={photosTitle}
          notesTitle={notesTitle}
          badges={badges}
        />

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
          <OrderLabelCardTeaser
            machine={machine}
            material={material}
            customerDisplay={customerDisplay}
            vis={vis}
            showDateTime={showDateTime}
            dateTimeTeaser={dateTimeTeaser}
            isClickable={isClickable}
            teaserHint={teaserHint}
          />
        ) : (
          <OrderLabelCardDetails
            isCompact={isCompact}
            labels={labels}
            vis={vis}
            machine={machine}
            material={material}
            quantity={quantity}
            customerContactLabels={customerContactLabels}
            customerDisplay={customerDisplay}
            description={description}
            showDateTime={showDateTime}
            dateLabel={dateLabel}
            timeLabel={timeLabel}
            orderedBy={orderedBy}
            orderedByText={orderedByText}
          />
        )}

        {footer ? <div className={isCompact ? "mt-2" : "mt-3"}>{footer}</div> : null}
      </div>
    </div>
  );
}
