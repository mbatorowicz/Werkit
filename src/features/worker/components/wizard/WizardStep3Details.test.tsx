import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStep3Details } from "@/features/worker/components/wizard/WizardStep3Details";
import { isWizardStep3NextDisabled } from "@/features/worker/components/wizard/WizardStep3Fields";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";

const dict = plDict.worker.client;

function makeCategory(overrides: Partial<WizardCategory> = {}): WizardCategory {
  return {
    id: 1,
    name: "Transport",
    showCustomer: false,
    showMaterial: false,
    showQuantity: false,
    showTaskDescription: false,
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

const machines: WizardMachine[] = [{ id: 3, name: "Wywrotka MAN", categoryIds: [1] }];
const materials: WizardMaterial[] = [{ id: 5, name: "Piasek" }];
const materialCategories: WizardMaterialCategory[] = [{ id: 9, name: "Kruszywa" }];
const customers: WizardCustomer[] = [{ id: 4, firstName: "Jan", lastName: "Nowak" }];

function renderStep(props: Partial<Parameters<typeof WizardStep3Details>[0]> = {}) {
  const defaults = {
    dict,
    selectedCategory: makeCategory() as WizardCategory | undefined,
    machines,
    materials,
    materialCategories,
    customers,
    resourceId: "3",
    materialCategoryId: "",
    setMaterialCategoryId: vi.fn(),
    materialId: "",
    setMaterialId: vi.fn(),
    customerId: "",
    setCustomerId: vi.fn(),
    quantityTons: "",
    setQuantityTons: vi.fn(),
    taskDescription: "",
    setTaskDescription: vi.fn(),
    repairDescription: "",
    setRepairDescription: vi.fn(),
    setStep: vi.fn(),
    canCreateCustomers: false,
    onCustomerCreated: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  renderWithProviders(<WizardStep3Details {...merged} />);
  return merged;
}

describe("WizardStep3Details", () => {
  it("pokazuje podsumowanie wybranej kategorii i zasobu", () => {
    renderStep();
    expect(screen.getByText(dict.wizardStep3Title)).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
  });

  it("ukrywa pola materiału, klienta, ilości i opisu gdy flagi kategorii są wyłączone", () => {
    renderStep();
    expect(screen.queryByText(dict.wizardMaterialLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardCustomerLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardQuantityLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardDescLabel)).not.toBeInTheDocument();
  });

  it("pokazuje pola warunkowe gdy kategoria je włącza", () => {
    renderStep({
      selectedCategory: makeCategory({
        showMaterial: true,
        showCustomer: true,
        showQuantity: true,
        showTaskDescription: true,
      }),
    });
    expect(screen.getByText(dict.wizardMaterialLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardCustomerLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardQuantityLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardDescLabel)).toBeInTheDocument();
  });

  it("dla naprawy pokazuje pole opisu naprawy zamiast opisu zlecenia", async () => {
    const user = userEvent.setup();
    const { setRepairDescription } = renderStep({
      selectedCategory: makeCategory({
        showTaskDescription: true,
        orderType: "machine_repair",
      }),
    });

    expect(screen.getByText(dict.repairDescription)).toBeInTheDocument();
    expect(screen.queryByText(dict.wizardDescLabel)).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(dict.repairDescriptionPlaceholder), "a");
    expect(setRepairDescription).toHaveBeenCalledWith("a");
  });

  it("wpisanie ilości wywołuje setQuantityTons", async () => {
    const user = userEvent.setup();
    const { setQuantityTons } = renderStep({
      selectedCategory: makeCategory({ showQuantity: true }),
    });

    await user.type(screen.getByPlaceholderText(dict.wizardQuantityPlaceholder), "5");
    expect(setQuantityTons).toHaveBeenCalledWith("5");
  });

  it("Dalej zablokowane gdy wymagany opis pusty, odblokowane po wypełnieniu", async () => {
    const user = userEvent.setup();
    renderStep({
      selectedCategory: makeCategory({ showTaskDescription: true, reqTaskDescription: true }),
    });
    expect(screen.getByRole("button", { name: new RegExp(dict.wizardNext) })).toBeDisabled();

    const { setStep } = renderStep({
      selectedCategory: makeCategory({ showTaskDescription: true, reqTaskDescription: true }),
      taskDescription: "Kurs z piaskiem",
    });
    const buttons = screen.getAllByRole("button", { name: new RegExp(dict.wizardNext) });
    const enabled = buttons.find((b) => !(b as HTMLButtonElement).disabled);
    expect(enabled).toBeDefined();
    await user.click(enabled as HTMLButtonElement);
    expect(setStep).toHaveBeenCalledWith(4);
  });

  it("Wróć i Zmień wracają do kroku 2", async () => {
    const user = userEvent.setup();
    const { setStep } = renderStep();

    await user.click(screen.getByRole("button", { name: new RegExp(dict.wizardBack) }));
    await user.click(screen.getByRole("button", { name: dict.wizardChangeLink }));

    expect(setStep).toHaveBeenCalledTimes(2);
    expect(setStep).toHaveBeenNthCalledWith(1, 2);
    expect(setStep).toHaveBeenNthCalledWith(2, 2);
  });
});

describe("isWizardStep3NextDisabled", () => {
  const base = {
    isRepair: false,
    materialId: "",
    customerId: "",
    quantityTons: "",
    taskDescription: "",
    repairDescription: "",
  };

  it("brak wymagań — przejście dozwolone", () => {
    expect(isWizardStep3NextDisabled({ ...base, selectedCategory: makeCategory() })).toBe(false);
  });

  it("wymagany materiał blokuje bez wyboru, przepuszcza z wyborem", () => {
    const cat = makeCategory({ reqMaterial: true });
    expect(isWizardStep3NextDisabled({ ...base, selectedCategory: cat })).toBe(true);
    expect(isWizardStep3NextDisabled({ ...base, selectedCategory: cat, materialId: "5" })).toBe(
      false
    );
  });

  it("wymagany opis dla naprawy sprawdza repairDescription, nie taskDescription", () => {
    const cat = makeCategory({ reqTaskDescription: true, orderType: "machine_repair" });
    expect(
      isWizardStep3NextDisabled({
        ...base,
        selectedCategory: cat,
        isRepair: true,
        taskDescription: "cokolwiek",
      })
    ).toBe(true);
    expect(
      isWizardStep3NextDisabled({
        ...base,
        selectedCategory: cat,
        isRepair: true,
        repairDescription: "wymiana filtra",
      })
    ).toBe(false);
  });

  it("wymagana ilość i klient blokują niezależnie", () => {
    const cat = makeCategory({ reqQuantity: true, reqCustomer: true });
    expect(isWizardStep3NextDisabled({ ...base, selectedCategory: cat, quantityTons: "10" })).toBe(
      true
    );
    expect(
      isWizardStep3NextDisabled({
        ...base,
        selectedCategory: cat,
        quantityTons: "10",
        customerId: "4",
      })
    ).toBe(false);
  });
});
