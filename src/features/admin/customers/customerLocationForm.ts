import { parseDecimalInput } from "@/lib/decimalInput";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import { parseCustomerAddress, serializeCustomerAddress } from "@/lib/customerAddress";

export type LocationForm = {
  label: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

export const emptyLocationForm = (): LocationForm => ({
  label: "",
  addressStreet: "",
  addressCity: "",
  addressPostalCode: "",
  latitude: "",
  longitude: "",
  isDefault: false,
});

function locationAddressFromStored(address: string | null | undefined) {
  const parts = parseCustomerAddress(address);
  return {
    addressStreet: parts.street,
    addressCity: parts.city,
    addressPostalCode: parts.postalCode,
  };
}

export function locationAddressParts(form: LocationForm) {
  return {
    street: form.addressStreet,
    city: form.addressCity,
    postalCode: form.addressPostalCode,
  };
}

export function isCustomerLocationRow(v: unknown): v is CustomerLocationRow {
  return v !== null && typeof v === "object" && typeof (v as CustomerLocationRow).id === "number";
}

export function locationFormFromRow(loc: CustomerLocationRow): LocationForm {
  return {
    label: loc.label,
    ...locationAddressFromStored(loc.address),
    latitude: loc.latitude,
    longitude: loc.longitude,
    isDefault: loc.isDefault,
  };
}

export function buildLocationPayload(form: LocationForm, waypoints: RouteLngLat[]) {
  return {
    label: form.label.trim(),
    address: serializeCustomerAddress(locationAddressParts(form)),
    latitude: form.latitude,
    longitude: form.longitude,
    isDefault: form.isDefault,
    routeWaypoints: waypoints,
  };
}

export function locationDestination(form: LocationForm): { lat: number; lng: number } | null {
  return form.latitude && form.longitude
    ? {
        lat: parseDecimalInput(form.latitude) ?? 0,
        lng: parseDecimalInput(form.longitude) ?? 0,
      }
    : null;
}
