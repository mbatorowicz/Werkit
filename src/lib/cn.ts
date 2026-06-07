import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Bezpieczne łączenie klas Tailwind — ostatnia wygrywa przy konflikcie. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
