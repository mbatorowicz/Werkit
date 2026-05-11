import type { MachinesCategory } from "./types";

export type ResourceFieldVisibility = {
  showResourceName: boolean;
  showResourceDescription: boolean;
  showRegistrationNumber: boolean;
};

export function mergeResourceFieldVisibility(
  categoryIds: number[],
  categories: MachinesCategory[],
): ResourceFieldVisibility {
  const selected = categories.filter((c) => categoryIds.includes(c.id));
  if (selected.length === 0) {
    return { showResourceName: true, showResourceDescription: true, showRegistrationNumber: true };
  }
  return {
    showResourceName: selected.some((c) => c.showResourceName !== false),
    showResourceDescription: selected.some((c) => Boolean(c.showResourceDescription)),
    showRegistrationNumber: selected.some((c) => c.showRegistrationNumber !== false),
  };
}
