import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CategoryColorBadge,
  CategoryColorCardBadge,
  CategoryColorPreview,
  CategoryColorTag,
} from "@/components/CategoryColorBadge";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColorStyles";

describe("CategoryColorBadge", () => {
  it("renderuje etykietę i kolor kategorii w stylu inline", () => {
    render(<CategoryColorBadge label="Transport" color="#10b981" />);

    const badge = screen.getByText("Transport");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ color: "#10b981" });
  });

  it("bez koloru używa domyślnego koloru kategorii", () => {
    render(<CategoryColorBadge label="Bez koloru" color={null} />);

    expect(screen.getByText("Bez koloru")).toHaveStyle({ color: DEFAULT_CATEGORY_COLOR });
  });

  it("CategoryColorCardBadge z onClick renderuje przycisk i obsługuje klik", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CategoryColorCardBadge label="Naprawa" color="#ef4444" onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Naprawa" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("CategoryColorCardBadge bez onClick nie jest przyciskiem, pusta etykieta to kreska", () => {
    render(<CategoryColorCardBadge label="  " color={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("CategoryColorTag z onClear pokazuje przycisk czyszczenia i wywołuje callback", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <CategoryColorTag
        label="Kruszywa"
        color="#10b981"
        onClear={onClear}
        clearAriaLabel="Usuń kategorię"
      />
    );

    expect(screen.getByText("Kruszywa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Usuń kategorię" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("CategoryColorTag bez onClear nie renderuje przycisku", () => {
    render(<CategoryColorTag label="Kruszywa" color="#10b981" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("CategoryColorPreview pokazuje hex koloru, z fallbackiem na domyślny", () => {
    const { rerender } = render(<CategoryColorPreview color="#3b82f6" />);
    expect(screen.getByText("#3b82f6")).toBeInTheDocument();

    rerender(<CategoryColorPreview color={null} />);
    expect(screen.getByText(DEFAULT_CATEGORY_COLOR)).toBeInTheDocument();
  });
});
