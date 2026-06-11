import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaterialStockAdjustModal } from "@/features/admin/materials/warehouse/MaterialStockAdjustModal";
import type { MaterialRow } from "@/features/admin/materials/types";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const adj = plDict.common.warehouse.adjustment;
const apiErrors = plDict.apiErrors as Record<string, string>;
const invalidQuantityMessage =
  apiErrors.invalid_quantity ?? plDict.admin.materials.warehouse.invalidQuantity;

function makeMaterial(overrides: Partial<MaterialRow> = {}): MaterialRow {
  return {
    id: 11,
    name: "Piasek płukany",
    unit: "t",
    categoryIds: [],
    stockQuantity: "8",
    ...overrides,
  };
}

function makeProps() {
  return {
    open: true,
    apiErrors,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MaterialStockAdjustModal", () => {
  it("nie renderuje nic bez wybranego materiału", () => {
    const { container } = renderWithProviders(
      <MaterialStockAdjustModal {...makeProps()} material={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("przy zmianie materiału resetuje ilość na bieżący stan", () => {
    const props = makeProps();
    const matA = makeMaterial({ id: 1, stockQuantity: "8" });
    const matB = makeMaterial({ id: 2, name: "Cement", stockQuantity: "42" });

    const { rerender } = renderWithProviders(
      <MaterialStockAdjustModal {...props} material={null} />
    );
    rerender(<MaterialStockAdjustModal {...props} material={matA} />);

    expect(screen.getByText(adj.modalTitle)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0")).toHaveValue("8");

    rerender(<MaterialStockAdjustModal {...props} material={matB} />);
    expect(screen.getByPlaceholderText("0")).toHaveValue("42");
  });

  it("pokazuje alert przy nieprawidłowej ilości i nie wysyła żądania", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([]);
    const props = makeProps();
    renderWithProviders(<MaterialStockAdjustModal {...props} material={makeMaterial()} />);

    const quantity = screen.getByPlaceholderText("0");
    await user.clear(quantity);
    await user.type(quantity, ",");
    await user.click(screen.getByRole("button", { name: adj.save }));

    expect(await screen.findByText(invalidQuantityMessage)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("zapisuje korektę przez PUT /api/materials/inventory i zamyka modal", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([
      { url: "/api/materials/inventory", method: "PUT", json: { ok: true } },
    ]);
    const props = makeProps();
    renderWithProviders(
      <MaterialStockAdjustModal {...props} material={makeMaterial({ id: 11 })} />
    );

    const quantity = screen.getByPlaceholderText("0");
    await user.type(quantity, "99,5");
    await user.click(screen.getByRole("button", { name: adj.save }));

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/materials/inventory");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ materialId: 11, quantity: "99.5" });
  });

  it("przy błędzie API pokazuje komunikat zapasowy i nie woła onSaved", async () => {
    const user = userEvent.setup();
    stubFetch([
      {
        url: "/api/materials/inventory",
        method: "PUT",
        status: 400,
        json: { error: "nieznany_kod_bledu" },
      },
    ]);
    const props = makeProps();
    renderWithProviders(<MaterialStockAdjustModal {...props} material={makeMaterial()} />);

    await user.type(screen.getByPlaceholderText("0"), "5");
    await user.click(screen.getByRole("button", { name: adj.save }));

    expect(await screen.findByText(apiErrors.save_error)).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
  });
});
