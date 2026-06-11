export type MachineTextFields = {
  brand: string;
  model: string;
  registrationNumber: string;
  description: string;
};

export type ResourceFormVisibility = {
  showResourceName: boolean;
  showResourceDescription: boolean;
  showRegistrationNumber: boolean;
};

export function parseMachineTextFields(body: Record<string, unknown>): MachineTextFields {
  return {
    brand: typeof body.brand === "string" ? body.brand : "",
    model: typeof body.model === "string" ? body.model : "",
    registrationNumber: typeof body.registrationNumber === "string" ? body.registrationNumber : "",
    description: typeof body.description === "string" ? body.description : "",
  };
}

export function parseMachineCategoryIds(raw: unknown): number[] | null {
  if (!raw || !Array.isArray(raw)) return null;
  const parsed = raw
    .map((c: string | number) => parseInt(String(c), 10))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  return parsed.length > 0 ? parsed : null;
}

export function visibleMachineFields(
  vis: ResourceFormVisibility,
  fields: MachineTextFields
): { brand: string; model: string; registrationNumber: string; description: string | null } {
  return {
    brand: vis.showResourceName ? fields.brand : "",
    model: vis.showResourceName ? fields.model : "",
    registrationNumber: vis.showRegistrationNumber ? fields.registrationNumber : "",
    description: vis.showResourceDescription ? fields.description : null,
  };
}
