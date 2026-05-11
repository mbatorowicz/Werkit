import type { MachinesResource } from "./types";

/** Wartość pola „Nazwa” przy edycji zasobu (łączy legacy brand/model lub bierze `name`). */
export function machineResourceNameForEdit(machine: MachinesResource): string {
  const hasStoredParts =
    Boolean(machine.brand?.trim()) ||
    Boolean(machine.model?.trim()) ||
    Boolean(machine.registrationNumber?.trim());
  if (hasStoredParts) {
    return [machine.brand, machine.model]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
  }
  return (machine.name ?? "").trim();
}
