import {
  customerAddressHasParts,
  parseCustomerAddress,
  type CustomerAddressParts,
} from "@/lib/customerAddress";
import { formatCustomerLabel } from "@/lib/customerSearch";

export type OrderLabelCustomerDisplay = {
  customerName: string | null;
  customerPhone: string | null;
  addressParts: CustomerAddressParts;
  hasAddress: boolean;
};

export function buildOrderLabelCustomerDisplay(input: {
  customerName?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
}): OrderLabelCustomerDisplay {
  const customerName =
    input.customerName?.trim() ||
    formatCustomerLabel({
      firstName: input.customerFirstName ?? null,
      lastName: input.customerLastName ?? null,
    }) ||
    null;
  const addressParts = parseCustomerAddress(input.customerAddress);

  return {
    customerName,
    customerPhone: input.customerPhone?.trim() || null,
    addressParts,
    hasAddress: customerAddressHasParts(addressParts),
  };
}
