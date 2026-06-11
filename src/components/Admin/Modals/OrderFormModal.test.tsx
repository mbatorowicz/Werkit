import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderFormModal from "@/components/Admin/Modals/OrderFormModal";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";
import type { BaseCategory, BaseMachine, BaseWorker, OrderFormState } from "@/types/admin";

const dict = plDict.admin.orders;

const categories: BaseCategory[] = [
  {
    id: 1,
    name: "Transport",
    showCustomer: false,
    showMaterial: false,
    showQuantity: false,
    showTaskDescription: false,
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
  },
];

const machines: BaseMachine[] = [{ id: 10, name: "Wywrotka MAN", categoryIds: [1] }];
const workers: BaseWorker[] = [{ id: 20, fullName: "Jan Kowalski" }];

const filledForm: OrderFormState = {
  userId: "20",
  resourceId: "10",
  categoryId: "1",
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

function renderModal(
  overrides: Partial<Parameters<typeof OrderFormModal>[0]> = {},
  initialForm: OrderFormState = filledForm
) {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => {});
  const utils = renderWithProviders(
    <OrderFormModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      editingOrderId={null}
      dict={dict}
      workers={workers}
      machines={machines}
      materials={[]}
      materialCategories={[]}
      customers={[]}
      categories={categories}
      initialForm={initialForm}
      {...overrides}
    />
  );
  return { onClose, onSave, ...utils };
}

beforeEach(() => {
  stubFetch([
    {
      url: "/api/admin/work-orders/schedule-conflicts",
      json: { conflicts: [] },
    },
  ]);
});

describe("OrderFormModal", () => {
  it("w trybie tworzenia pokazuje tytuł wystawiania zlecenia", async () => {
    renderModal();
    expect(await screen.findByRole("heading", { name: dict.issueOrder })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dict.save })).toBeInTheDocument();
  });

  it("w trybie edycji pokazuje tytuł z numerem zlecenia", async () => {
    renderModal({ editingOrderId: 7 });
    const expected = dict.modalEditOrderTitle.replace(/\{id\}/g, "7");
    expect(await screen.findByRole("heading", { name: expected })).toBeInTheDocument();
  });

  it("przy isOpen=false nie renderuje modala", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("heading", { name: dict.issueOrder })).not.toBeInTheDocument();
  });

  it("klik Zapisz wysyła formularz do onSave (bez forceSave)", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();

    await screen.findByRole("heading", { name: dict.issueOrder });
    await user.click(screen.getByRole("button", { name: dict.save }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "1",
        userId: "20",
        resourceId: "10",
        forceSave: false,
      }),
      { forceSave: false }
    );
  });

  it("bez wybranej kategorii przycisk Zapisz jest zablokowany i onSave nie jest wywoływane", async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal({}, { ...filledForm, categoryId: "" });

    await screen.findByRole("heading", { name: dict.issueOrder });
    const save = screen.getByRole("button", { name: dict.save });
    expect(save).toBeDisabled();
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("klik Anuluj wywołuje onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await screen.findByRole("heading", { name: dict.issueOrder });
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.modalCancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("usunięcie oczekującego zlecenia wymaga potwierdzenia w appConfirm", async () => {
    const user = userEvent.setup();
    const onDeletePending = vi.fn(async () => {});
    renderModal({ editingOrderId: 7, onDeletePending });

    await user.click(await screen.findByRole("button", { name: dict.deletePendingOrderLabel }));

    expect(await screen.findByText(dict.deletePendingConfirm)).toBeInTheDocument();
    expect(onDeletePending).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));
    await waitFor(() => expect(onDeletePending).toHaveBeenCalledTimes(1));
  });

  it("anulowanie potwierdzenia nie usuwa zlecenia", async () => {
    const user = userEvent.setup();
    const onDeletePending = vi.fn(async () => {});
    renderModal({ editingOrderId: 7, onDeletePending });

    await user.click(await screen.findByRole("button", { name: dict.deletePendingOrderLabel }));
    await screen.findByText(dict.deletePendingConfirm);

    // Dialog potwierdzenia renderuje się po treści modala — jego Anuluj jest ostatni w DOM.
    const cancelButtons = screen.getAllByRole("button", { name: plDict.admin.ui.modalCancel });
    await user.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() =>
      expect(screen.queryByText(dict.deletePendingConfirm)).not.toBeInTheDocument()
    );
    expect(onDeletePending).not.toHaveBeenCalled();
  });

  it("bez editingOrderId nie pokazuje przycisku usuwania zlecenia", async () => {
    renderModal({ onDeletePending: vi.fn(async () => {}) });
    await screen.findByRole("heading", { name: dict.issueOrder });
    expect(
      screen.queryByRole("button", { name: dict.deletePendingOrderLabel })
    ).not.toBeInTheDocument();
  });
});
