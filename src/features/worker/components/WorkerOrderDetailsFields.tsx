"use client";

import { CustomerContactFields } from "@/components/customers/CustomerContactFields";
import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import type { AppDictionary } from "@/i18n/types";
import { buildOrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";
import { UI_RADIUS_INNER } from "@/lib/uiRadius";

export function WorkerOrderDetailsFields({
  data,
  fieldLabels,
  customerDict,
}: {
  data: WorkerOrderDetailsData;
  fieldLabels: AppDictionary["admin"]["orderFields"];
  customerDict: AppDictionary["admin"]["customers"];
}) {
  const vis = data.fieldVisibility;
  const customerDisplay = buildOrderLabelCustomerDisplay({
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
  });

  const fieldsCard = `${UI_RADIUS_INNER} border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50 px-4 py-3`;

  return (
    <div className={`${fieldsCard} grid grid-cols-1 gap-y-2.5`}>
      {data.dateLabel ? <OrderDetailField label={fieldLabels.date} value={data.dateLabel} /> : null}
      {data.timeLabel ? <OrderDetailField label={fieldLabels.time} value={data.timeLabel} /> : null}
      <OrderDetailField label={fieldLabels.resource} value={data.resourceName || "—"} />
      {vis.showMaterial ? (
        <OrderDetailField
          label={fieldLabels.material}
          value={data.materialName?.trim() ? data.materialName : "—"}
        />
      ) : null}
      {vis.showQuantity ? (
        <OrderDetailField
          label={fieldLabels.quantity}
          value={data.quantity?.trim() ? data.quantity : "—"}
        />
      ) : null}
      {vis.showCustomer ? (
        <CustomerContactFields
          variant="order"
          labels={{
            customer: fieldLabels.customer,
            streetLabel: customerDict.streetLabel,
            postalCodeLabel: customerDict.postalCodeLabel,
            cityLabel: customerDict.cityLabel,
            phoneLabel: customerDict.phoneLabel,
          }}
          customerName={customerDisplay.customerName}
          phone={customerDisplay.customerPhone}
          addressParts={customerDisplay.addressParts}
          showPhoneWhenEmpty={false}
          phoneAsLink
        />
      ) : null}
      {vis.showDescription && data.description?.trim() ? (
        <OrderDetailField label={vis.descriptionLabel} value={data.description} multiline />
      ) : null}
    </div>
  );
}
