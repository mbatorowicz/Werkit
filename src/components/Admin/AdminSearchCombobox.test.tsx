import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

beforeAll(() => {
  // jsdom nie implementuje scrollIntoView (przewijanie podświetlonej opcji)
  Element.prototype.scrollIntoView = vi.fn();
});

const options: AdminSearchComboboxOption[] = [
  { id: "1", label: "Alfa Romeo" },
  { id: "2", label: "Beta Maszyna", sublabel: "Hala 2" },
  { id: "3", label: "Gamma Koparka" },
];

function getInput() {
  return screen.getByRole("combobox");
}

describe("AdminSearchCombobox", () => {
  it("pokazuje etykietę wybranej opcji w polu", () => {
    renderWithProviders(<AdminSearchCombobox options={options} value="2" onChange={vi.fn()} />);
    expect(getInput()).toHaveValue("Beta Maszyna");
  });

  it("po fokusie otwiera listę ze wszystkimi opcjami", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={vi.fn()} />);

    await user.click(getInput());
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(3);
  });

  it("filtruje opcje po wpisaniu zapytania", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={vi.fn()} />);

    await user.click(getInput());
    await user.keyboard("gamma");

    const listbox = await screen.findByRole("listbox");
    const visible = within(listbox).getAllByRole("option");
    expect(visible).toHaveLength(1);
    expect(visible[0]).toHaveTextContent("Gamma Koparka");
  });

  it("pokazuje komunikat braku wyników dla niedopasowanego zapytania", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={vi.fn()} />);

    await user.click(getInput());
    await user.keyboard("xyz-nie-ma");

    expect(await screen.findByText(plDict.admin.ui.noResults)).toBeInTheDocument();
  });

  it("klik w opcję wywołuje onChange z jej id i zamyka listę", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={onChange} />);

    await user.click(getInput());
    await user.click(await screen.findByText("Beta Maszyna"));

    expect(onChange).toHaveBeenCalledWith("2");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("nawigacja klawiaturą: strzałka w dół + Enter wybiera podświetloną opcję", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={onChange} />);

    await user.click(getInput());
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("Escape zamyka listę bez wyboru", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<AdminSearchCombobox options={options} value="" onChange={onChange} />);

    await user.click(getInput());
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("przycisk czyszczenia kasuje wybór (onChange z pustym id)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<AdminSearchCombobox options={options} value="1" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.clear }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("disabled blokuje pole i nie otwiera listy", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AdminSearchCombobox options={options} value="" onChange={vi.fn()} disabled />
    );

    const input = getInput();
    expect(input).toBeDisabled();
    await user.click(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
