import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStep1Category } from "@/features/worker/components/wizard/WizardStep1Category";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type { WizardCategory } from "@/types/wizard";
import type { WorkOrder } from "@/types/worker";

const dict = plDict.worker.client;

function makeCategory(overrides: Partial<WizardCategory> = {}): WizardCategory {
  return {
    id: 1,
    name: "Transport",
    icon: "Truck",
    showCustomer: true,
    showMaterial: true,
    showQuantity: true,
    showTaskDescription: true,
    showResourceName: true,
    showResourceDescription: false,
    showRegistrationNumber: true,
    reqCustomer: false,
    reqMaterial: false,
    reqQuantity: false,
    reqTaskDescription: false,
    isGlobal: false,
    orderType: "machine_work",
    ...overrides,
  };
}

const categories = [makeCategory(), makeCategory({ id: 2, name: "Praca koparką" })];

const pendingOrder: WorkOrder = {
  id: 31,
  categoryId: 1,
  categoryName: "Transport",
  taskDescription: "Kurs z piaskiem",
  resourceName: "Wywrotka MAN",
  materialName: null,
  customerName: null,
  priority: "HIGH",
  dueDate: null,
  createdAt: "2026-06-10T08:00:00.000Z",
};

function renderStep(props: Partial<Parameters<typeof WizardStep1Category>[0]> = {}) {
  const defaults = {
    dict,
    orders: [] as WorkOrder[],
    categories,
    categoryId: "",
    setCategoryId: vi.fn(),
    setStep: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  renderWithProviders(<WizardStep1Category {...merged} />);
  return merged;
}

describe("WizardStep1Category", () => {
  it("renderuje tytuł i podtytuł kreatora bez oczekujących zleceń", () => {
    renderStep();
    expect(screen.getByText(dict.wizardTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardSubtitle)).toBeInTheDocument();
    expect(screen.queryByText(dict.wizardPendingOrders)).not.toBeInTheDocument();
  });

  it("wybór kategorii z comboboxa wywołuje setCategoryId", async () => {
    const user = userEvent.setup();
    const { setCategoryId } = renderStep();

    await user.click(screen.getByRole("combobox", { name: dict.wizardTitle }));
    await user.click(await screen.findByText("Praca koparką"));

    expect(setCategoryId).toHaveBeenCalledWith("2");
  });

  it("po wybraniu kategorii pokazuje panel z nazwą i opisem klasy", () => {
    renderStep({ categoryId: "1" });
    expect(screen.getAllByText("Transport").length).toBeGreaterThan(0);
    expect(screen.getByText(dict.wizardClassType)).toBeInTheDocument();
  });

  it("przycisk Dalej jest zablokowany bez kategorii, a z kategorią przechodzi do kroku 2", async () => {
    const user = userEvent.setup();
    const first = renderStep();
    const nextBtn = screen.getByRole("button", { name: new RegExp(dict.wizardNext) });
    expect(nextBtn).toBeDisabled();
    expect(first.setStep).not.toHaveBeenCalled();

    const { setStep } = renderStep({ categoryId: "1" });
    const buttons = screen.getAllByRole("button", { name: new RegExp(dict.wizardNext) });
    const enabled = buttons.find((b) => !(b as HTMLButtonElement).disabled);
    expect(enabled).toBeDefined();
    await user.click(enabled as HTMLButtonElement);
    expect(setStep).toHaveBeenCalledWith(2);
  });

  it("z oczekującymi zleceniami pokazuje sekcję zleceń i tytuł inicjatywy własnej", () => {
    renderStep({ orders: [pendingOrder], onAcceptOrder: vi.fn() });

    expect(screen.getByText(dict.wizardPendingOrders)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardTitleOwn)).toBeInTheDocument();
    expect(screen.getByText("#31")).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
  });

  it("klik w oczekujące zlecenie wywołuje onAcceptOrder z id zlecenia", async () => {
    const user = userEvent.setup();
    const onAcceptOrder = vi.fn();
    renderStep({ orders: [pendingOrder], onAcceptOrder });

    await user.click(screen.getByText(new RegExp(dict.startTask)));
    expect(onAcceptOrder).toHaveBeenCalledWith(31);
  });

  it("bez onAcceptOrder nie pokazuje sekcji oczekujących zleceń", () => {
    renderStep({ orders: [pendingOrder] });
    expect(screen.queryByText(dict.wizardPendingOrders)).not.toBeInTheDocument();
  });
});
