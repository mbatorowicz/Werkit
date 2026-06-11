import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkerDelegateOrderModal } from "@/features/worker/components/delegation/WorkerDelegateOrderModal";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.worker.client;
const ui = plDict.admin.ui;

function stubModalFetch(postSpec?: { status: number; json: unknown }) {
  return stubFetch([
    {
      url: "/api/worker/delegation-targets",
      json: [{ id: 1, fullName: "Jan Kowalski", orgLabel: null }],
    },
    { url: "/api/categories", json: [{ id: 2, name: "Transport" }] },
    {
      url: "/api/machines",
      json: [
        { id: 3, name: "Wywrotka MAN", categoryIds: [2] },
        { id: 4, name: "Koparka", categoryIds: [9] },
      ],
    },
    {
      url: "/api/worker/delegations",
      method: "POST",
      status: postSpec?.status ?? 200,
      json: postSpec?.json ?? { ok: true },
    },
  ]);
}

function renderModal(props: Partial<Parameters<typeof WorkerDelegateOrderModal>[0]> = {}) {
  const defaults = { open: true, onClose: vi.fn(), onSuccess: vi.fn() };
  const merged = { ...defaults, ...props };
  renderWithProviders(<WorkerDelegateOrderModal {...merged} />);
  return merged;
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText(dict.delegateChooseWorker), "1");
  await user.selectOptions(screen.getByLabelText(dict.delegateChooseCategory), "2");
  await user.selectOptions(screen.getByLabelText(dict.delegateChooseMachine), "3");
}

describe("WorkerDelegateOrderModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("nie renderuje się gdy open === false", () => {
    stubModalFetch();
    renderModal({ open: false });
    expect(screen.queryByText(dict.delegateOrderTitle)).not.toBeInTheDocument();
  });

  it("po otwarciu ładuje dane i renderuje pola formularza z opcjami", async () => {
    stubModalFetch();
    renderModal();

    expect(screen.getByText(dict.delegateOrderTitle)).toBeInTheDocument();
    expect(await screen.findByLabelText(dict.delegateChooseWorker)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Jan Kowalski" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Transport" })).toBeInTheDocument();
  });

  it("submit zablokowany do czasu wyboru pracownika, kategorii i zasobu", async () => {
    const user = userEvent.setup();
    stubModalFetch();
    renderModal();

    const submit = screen.getByRole("button", { name: dict.delegateOrderSubmit });
    await screen.findByLabelText(dict.delegateChooseWorker);
    expect(submit).toBeDisabled();

    await fillRequiredFields(user);
    expect(submit).toBeEnabled();
  });

  it("select zasobu jest zablokowany do wyboru kategorii i filtruje maszyny po kategorii", async () => {
    const user = userEvent.setup();
    stubModalFetch();
    renderModal();

    const machineSelect = await screen.findByLabelText(dict.delegateChooseMachine);
    expect(machineSelect).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(dict.delegateChooseCategory), "2");
    expect(machineSelect).toBeEnabled();
    expect(screen.getByRole("option", { name: "Wywrotka MAN" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Koparka" })).not.toBeInTheDocument();
  });

  it("poprawny submit wysyła POST z danymi i po komunikacie wywołuje onClose i onSuccess", async () => {
    const user = userEvent.setup();
    const fetchMock = stubModalFetch();
    const { onClose, onSuccess } = renderModal();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(dict.delegateTaskDescription), "Kurs z piaskiem");
    await user.click(screen.getByRole("button", { name: dict.delegateOrderSubmit }));

    expect(await screen.findByText(dict.delegateOrderSuccess)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[0]).toBe("/api/worker/delegations");
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      userId: 1,
      categoryId: 2,
      resourceId: 3,
      taskDescription: "Kurs z piaskiem",
      dueDate: null,
    });

    await user.click(screen.getByRole("button", { name: ui.dialogOk }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("błąd API pokazuje komunikat z kodem błędu i nie zamyka modala", async () => {
    const user = userEvent.setup();
    stubModalFetch({ status: 400, json: { error: "xyz_code" } });
    const { onClose, onSuccess } = renderModal();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: dict.delegateOrderSubmit }));

    expect(await screen.findByText("xyz_code")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: ui.dialogOk }));

    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
