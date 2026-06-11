import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStep4Summary } from "@/features/worker/components/wizard/WizardStep4Summary";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";

const dict = plDict.worker.client;

function makeCategory(overrides: Partial<WizardCategory> = {}): WizardCategory {
  return {
    id: 1,
    name: "Transport",
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

const machines: WizardMachine[] = [{ id: 3, name: "Wywrotka MAN", categoryIds: [1] }];
const materials: WizardMaterial[] = [{ id: 5, name: "Piasek" }];
const customers: WizardCustomer[] = [{ id: 4, firstName: "Jan", lastName: "Nowak" }];

function renderSummary(props: Partial<Parameters<typeof WizardStep4Summary>[0]> = {}) {
  const defaults = {
    dict,
    selectedCategory: makeCategory() as WizardCategory | undefined,
    machines,
    materials,
    customers,
    materialId: "",
    customerId: "",
    quantityTons: "",
    resourceId: "3",
    taskDescription: "",
    repairDescription: "",
    dueDate: "",
    expectedDurationHours: "",
    hasScheduleConflicts: false,
    isLoading: false,
    onSave: vi.fn(),
    setStep: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  renderWithProviders(<WizardStep4Summary {...merged} />);
  return merged;
}

describe("WizardStep4Summary", () => {
  it("zawsze pokazuje wiersze kategorii i zasobu", () => {
    renderSummary();
    expect(screen.getByText(dict.wizardStep5Title)).toBeInTheDocument();
    expect(screen.getByText(dict.wizardSummaryType)).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText(dict.wizardSummaryMachine)).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
  });

  it("ukrywa wiersze warunkowe gdy brak danych", () => {
    renderSummary();
    expect(screen.queryByText(dict.wizardSummaryAggregate)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardQuantityLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardSummaryCustomer)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.wizardSummarySchedule)).not.toBeInTheDocument();
  });

  it("pokazuje wiersze materiału, ilości, opisu i klienta gdy dane są ustawione", () => {
    renderSummary({
      materialId: "5",
      customerId: "4",
      quantityTons: "20",
      taskDescription: "Kurs z piaskiem",
    });

    expect(screen.getByText(dict.wizardSummaryAggregate)).toBeInTheDocument();
    expect(screen.getByText("Piasek")).toBeInTheDocument();
    expect(screen.getByText("20t")).toBeInTheDocument();
    expect(screen.getByText(dict.wizardDescLabel)).toBeInTheDocument();
    expect(screen.getByText("Kurs z piaskiem")).toBeInTheDocument();
    expect(screen.getByText(dict.wizardSummaryCustomer)).toBeInTheDocument();
    expect(screen.getByText("Nowak")).toBeInTheDocument();
  });

  it("dla naprawy używa opisu naprawy i etykiety naprawy", () => {
    renderSummary({
      selectedCategory: makeCategory({ orderType: "machine_repair" }),
      taskDescription: "to ma być zignorowane",
      repairDescription: "Wymiana filtra",
    });

    expect(screen.getByText(dict.repairDescription)).toBeInTheDocument();
    expect(screen.getByText("Wymiana filtra")).toBeInTheDocument();
    expect(screen.queryByText("to ma być zignorowane")).not.toBeInTheDocument();
  });

  it("pokazuje wiersz terminu gdy podano czas trwania i termin", () => {
    renderSummary({ dueDate: "2026-06-11T10:00", expectedDurationHours: "2" });
    expect(screen.getByText(dict.wizardSummarySchedule)).toBeInTheDocument();
    expect(screen.getByText("2h · 2026-06-11 10:00")).toBeInTheDocument();
  });

  it("klik Zapisz wywołuje onSave, a wiersz Popraw Dane wraca do kroku 4", async () => {
    const user = userEvent.setup();
    const { onSave, setStep } = renderSummary();

    await user.click(screen.getByRole("button", { name: dict.wizardSaveOrder }));
    expect(onSave).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: new RegExp(dict.wizardFixData) }));
    expect(setStep).toHaveBeenCalledWith(4);
  });

  it("konflikt grafiku blokuje zapis", async () => {
    const user = userEvent.setup();
    const { onSave } = renderSummary({ hasScheduleConflicts: true });

    const saveBtn = screen.getByRole("button", { name: dict.wizardSaveOrder });
    expect(saveBtn).toBeDisabled();
    await user.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("respektuje nadpisaną etykietę przycisku zapisu", () => {
    renderSummary({ saveLabel: "Zapisz zmiany w zleceniu" });
    expect(screen.getByRole("button", { name: "Zapisz zmiany w zleceniu" })).toBeInTheDocument();
  });
});
