import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { OrderDetailField } from "@/components/work-orders/OrderDetailField";
import type { CustomerAddressParts } from "@/lib/customerAddress";
import { customerAddressHasParts } from "@/lib/customerAddress";
import { phoneTelHref } from "@/lib/phoneTelHref";

export type CustomerContactFieldLabels = {
  customer: string;
  streetLabel: string;
  postalCodeLabel: string;
  cityLabel: string;
  phoneLabel: string;
  /** Tylko wariant admin — etykieta gdy brak rozbitego adresu */
  defaultAddressLabel?: string;
  noAddressValue?: string;
};

type SharedProps = {
  labels: CustomerContactFieldLabels;
  customerName: string | null;
  phone: string | null;
  addressParts: CustomerAddressParts;
};

function AddressFields({
  variant,
  labels,
  addressParts,
}: {
  variant: "order" | "admin";
  labels: CustomerContactFieldLabels;
  addressParts: CustomerAddressParts;
}) {
  const hasAddress = customerAddressHasParts(addressParts);

  if (variant === "admin" && !hasAddress) {
    return (
      <AdminPreviewField
        label={labels.defaultAddressLabel ?? labels.streetLabel}
        value={labels.noAddressValue ?? null}
      />
    );
  }

  const street = addressParts.street.trim();
  const postal = addressParts.postalCode.trim();
  const city = addressParts.city.trim();

  if (variant === "order") {
    return (
      <>
        {hasAddress && street ? (
          <OrderDetailField label={labels.streetLabel} value={street} />
        ) : null}
        {hasAddress && postal ? (
          <OrderDetailField label={labels.postalCodeLabel} value={postal} />
        ) : null}
        {hasAddress && city ? (
          <OrderDetailField label={labels.cityLabel} value={city} />
        ) : null}
      </>
    );
  }

  return (
    <>
      {hasAddress && street ? (
        <AdminPreviewField label={labels.streetLabel} value={street} />
      ) : null}
      {hasAddress && postal ? (
        <AdminPreviewField label={labels.postalCodeLabel} value={postal} />
      ) : null}
      {hasAddress && city ? (
        <AdminPreviewField label={labels.cityLabel} value={city} />
      ) : null}
    </>
  );
}

/** Pola klienta: nazwa, adres (ulica → kod → miasto), telefon — karty zleceń i modale. */
export function CustomerContactFields({
  variant,
  labels,
  customerName,
  phone,
  addressParts,
  showPhoneWhenEmpty = variant === "order",
  phoneAsLink = false,
}: SharedProps & {
  variant: "order" | "admin";
  showPhoneWhenEmpty?: boolean;
  phoneAsLink?: boolean;
}) {
  const nameValue = customerName?.trim() || "—";
  const phoneValue = phone?.trim() ?? "";

  return (
    <>
      {variant === "order" ? (
        <OrderDetailField label={labels.customer} value={nameValue} />
      ) : (
        <AdminPreviewField label={labels.customer} value={customerName?.trim() || null} />
      )}
      <AddressFields variant={variant} labels={labels} addressParts={addressParts} />
      {variant === "order" ? (
        showPhoneWhenEmpty || phoneValue ? (
          <OrderDetailField
            label={labels.phoneLabel}
            value={phoneValue || "—"}
            valueNode={
              phoneAsLink && phoneValue ? (
                <a
                  href={phoneTelHref(phoneValue)}
                  className="mt-0.5 inline-block text-[15px] font-semibold text-emerald-700 dark:text-emerald-400 break-all hover:underline"
                >
                  {phoneValue}
                </a>
              ) : undefined
            }
          />
        ) : null
      ) : (
        <AdminPreviewField label={labels.phoneLabel} value={phoneValue || null} />
      )}
    </>
  );
}
