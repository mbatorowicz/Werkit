export class MaterialStockMovementError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "MaterialStockMovementError";
    this.code = code;
  }
}
