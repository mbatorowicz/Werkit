import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Dispatch, SetStateAction } from "react";
import { OrderFormFields } from "@/components/Admin/Modals/OrderFormFields";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type {
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseWorker,
  OrderFormState,
} from "@/types/admin";

const dict = plDict.admin.orders;

const transportCategory: BaseCategory = {
  id: 1,
  name: "Transport",
  showCustomer: true,
  showMaterial: true,
  showQuantity: true,
  showTaskDescription: true,
  reqCustomer: false,
  reqMaterial: false,
  reqQuantity: false,
  reqTaskDescription: false,
  isGlobal: false,
  isStationary: false,
  color: null,
  showResourceName: true,
  showResourceDescription: false,
  showRegistrationNumber: true,
  orderType: "machine_work",
};

const repairCategory: BaseCategory = {
  ...transportCategory,
  id: 2,
  name: "Naprawa",
  showCustomer: false,
  showMaterial: false,
  showQuantity: false,
  showTaskDescription: true,
  orderType: "machine_repair",
};

const bareCategory: BaseCategory = {
  ...transportCategory,
  id: 3,
  name: "Sprzątanie placu",
  showCustomer: false,
  showMaterial: false,
  showQuantity: false,
  showTaskDescription: false,
};

const categories = [transportCategory, repairCategory, bareCategory];

const machines: BaseMachine[] = [
  { id: 10, name: "Wywrotka MAN", categoryIds: [1, 2], resourceGroupId: 7 },
];

const workers: BaseWorker[] = [{ id: 20, fullName: "Jan Kowalski" }];

const customers: BaseCustomer[] = [
  { id: 30, firstName: "Anna", lastName: "Nowak", defaultAddress: "Polna 1, Kraków" },
];

const emptyForm: OrderFormState = {
  userId: "",
  resourceId: "",
  categoryId: "",
  materialCategoryId: "",
  materialId: "",
  customerId: "",
  taskDescription: "",
  quantityTons: "",
  priority: "NORMAL",
  expectedDurationHours: "",
  dueDate: "",
  forceSave: false,
  orderType: "machine_work",
  repairDescription: "",
};

type SetForm = Dispatch<SetStateAction<OrderFormState>>;

function renderFields(formOverrides: Partial<OrderFormState> = {}) {
  const setForm = vi.fn<(action: SetStateAction<OrderFormState>) => void>();
  const form: OrderFormState = { ...emptyForm, ...formOverrides };
  const utils = renderWithProviders(
    <OrderFormFields
      form={form}
      setForm={setForm as SetForm}
      dict={dict}
      categories={categories}
      workers={workers}
      machines={machines}
      materials={[]}
      materialCategories={[]}
      customers={customers}
      extraCustomers={[]}
      setExtraCustomers={vi.fn()}
    />
  );
  return { setForm, form, ...utils };
}

describe("OrderFormFields", () => {
  it("bez wybranej kategorii pokazuje podpowiedź i blokuje pracownika oraz maszynę", () => {
    renderFields();

    expect(screen.getByText(dict.pickCategoryFirstHint)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: dict.chooseWorker })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: dict.chooseMachine })).toBeDisabled();
    expect(screen.queryByText(dict.quantityTonsLabel)).not.toBeInTheDocument();
  });

  it("wybór kategorii propaguje categoryId, orderType i czyści zasób przez setForm", async () => {
    const user = userEvent.setup();
    const { setForm } = renderFields();

    await user.click(screen.getByRole("combobox", { name: dict.jobType }));
    await user.click(await screen.findByText("Transport"));

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "1",
        orderType: "machine_work",
        resourceId: "",
        materialId: "",
      })
    );
  });

  it("kategoria z pełnymi flagami pokazuje pola: materiał, klient, ilość i opis", () => {
    renderFields({ categoryId: "1" });

    expect(screen.getByText(dict.chooseMaterial)).toBeInTheDocument();
    expect(screen.getByText(dict.chooseCustomer)).toBeInTheDocument();
    expect(screen.getByText(dict.quantityTonsLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.taskDesc)).toBeInTheDocument();
    expect(screen.queryByText(dict.pickCategoryFirstHint)).not.toBeInTheDocument();
  });

  it("kategoria naprawy ukrywa pola materiału/ilości i pokazuje opis naprawy", () => {
    renderFields({ categoryId: "2", orderType: "machine_repair" });

    expect(screen.queryByText(dict.quantityTonsLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.chooseMaterial)).not.toBeInTheDocument();
    expect(screen.getByText(dict.repairDescription)).toBeInTheDocument();
  });

  it("zmiana opisu naprawy trafia do setForm jako repairDescription", () => {
    const { setForm } = renderFields({ categoryId: "2", orderType: "machine_repair" });

    fireEvent.change(screen.getByPlaceholderText(dict.repairDescriptionPlaceholder), {
      target: { value: "Wymiana paska" },
    });

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ repairDescription: "Wymiana paska" })
    );
  });

  it("zmiana opisu zlecenia trafia do setForm jako taskDescription", () => {
    const { setForm } = renderFields({ categoryId: "1" });

    fireEvent.change(screen.getByPlaceholderText(dict.taskDescPlaceholder), {
      target: { value: "Dostawa na budowę" },
    });

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ taskDescription: "Dostawa na budowę" })
    );
  });

  it("zmiana ilości materiału trafia do setForm jako quantityTons", () => {
    const { setForm } = renderFields({ categoryId: "1" });

    fireEvent.change(screen.getByPlaceholderText(dict.quantityTonsPlaceholder), {
      target: { value: "24" },
    });

    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ quantityTons: "24" }));
  });

  it("zmiana priorytetu trafia do setForm", () => {
    const { setForm } = renderFields({ categoryId: "1" });

    fireEvent.change(screen.getByDisplayValue(dict.priorityNormal), {
      target: { value: "URGENT" },
    });

    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ priority: "URGENT" }));
  });

  it("kategoria bez maszyn pokazuje ostrzeżenie i blokuje wybór zasobu", () => {
    renderFields({ categoryId: "3" });

    expect(screen.getByText(dict.noMachinesForCategory)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: dict.chooseMachine })).toBeDisabled();
  });
});
