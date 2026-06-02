/** Błąd domenowy ruchów magazynowych (kod → i18n `dur.apiErrors`). */
export class StockMovementError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = "StockMovementError";
  }
}
