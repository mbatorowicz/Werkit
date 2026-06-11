import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpSectionsList } from "@/components/help/HelpSectionsList";
import type { HelpSection } from "@/types/help";

const sections: HelpSection[] = [
  {
    id: "start-work",
    title: "Rozpoczęcie pracy",
    paragraphs: ["Wybierz zlecenie z listy.", "Potwierdź start sesji."],
    bullets: ["Sprawdź pojazd", "Włącz GPS"],
  },
  {
    id: "dur-parts",
    title: "Części zamienne",
    paragraphs: ["Dodawaj części do zlecenia naprawy."],
  },
  {
    id: "history",
    title: "Historia sesji",
    paragraphs: ["Przeglądaj zakończone sesje."],
  },
];

describe("HelpSectionsList", () => {
  it("renderuje tytuły wszystkich sekcji jako zwinięte akordeony", () => {
    render(<HelpSectionsList sections={sections} scope="worker" />);

    expect(screen.getByRole("button", { name: "Rozpoczęcie pracy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Części zamienne" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historia sesji" })).toBeInTheDocument();
    expect(screen.queryByText("Wybierz zlecenie z listy.")).not.toBeInTheDocument();
  });

  it("rozwinięcie sekcji pokazuje akapity i punkty listy", async () => {
    const user = userEvent.setup();
    render(<HelpSectionsList sections={sections} scope="worker" />);

    await user.click(screen.getByRole("button", { name: "Rozpoczęcie pracy" }));

    expect(screen.getByText("Wybierz zlecenie z listy.")).toBeInTheDocument();
    expect(screen.getByText("Potwierdź start sesji.")).toBeInTheDocument();
    expect(screen.getByText("Sprawdź pojazd")).toBeInTheDocument();
    expect(screen.getByText("Włącz GPS")).toBeInTheDocument();
  });

  it("excludeIds ukrywa wskazane sekcje", () => {
    render(<HelpSectionsList sections={sections} scope="worker" excludeIds={["dur-parts"]} />);

    expect(screen.queryByRole("button", { name: "Części zamienne" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rozpoczęcie pracy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historia sesji" })).toBeInTheDocument();
  });

  it("pusta lista wykluczeń nie zmienia widocznych sekcji", () => {
    render(<HelpSectionsList sections={sections} scope="worker" excludeIds={[]} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});
