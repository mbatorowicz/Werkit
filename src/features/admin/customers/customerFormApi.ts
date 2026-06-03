import {
  customerAddressGeocodeQuery,
  parseCustomerAddress,
  serializeCustomerAddress,
  type CustomerAddressParts,
} from "@/lib/customerAddress";
import type { CustomerFormState } from "./CustomerFormFields";

export function customerFormAddressParts(form: CustomerFormState): CustomerAddressParts {
  return {
    street: form.addressStreet,
    city: form.addressCity,
    postalCode: form.addressPostalCode,
  };
}

export function customerFormFromStored(input: {
  firstName?: string | null;
  lastName: string;
  phone?: string | null;
  defaultAddress?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}): CustomerFormState {
  const parts = parseCustomerAddress(input.defaultAddress);
  return {
    firstName: input.firstName || "",
    lastName: input.lastName,
    phone: input.phone || "",
    addressStreet: parts.street,
    addressCity: parts.city,
    addressPostalCode: parts.postalCode,
    latitude: input.latitude || "",
    longitude: input.longitude || "",
  };
}

export function customerFormToApiBody(form: CustomerFormState) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone,
    defaultAddress: serializeCustomerAddress(customerFormAddressParts(form)),
    latitude: form.latitude,
    longitude: form.longitude,
  };
}

export function customerFormGeocodeQuery(form: CustomerFormState): string {
  return customerAddressGeocodeQuery(customerFormAddressParts(form));
}
