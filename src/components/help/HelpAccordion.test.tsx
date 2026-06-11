import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Info } from "lucide-react";
import { HelpAccordion } from "@/components/help/HelpAccordion";

function renderAccordion() {
  return render(
    <HelpAccordion title="Jak zacząć pracę" icon={<Info data-testid="icon" />}>
      <p>Treść sekcji pomocy</p>
    </HelpAccordion>
  );
}

describe("HelpAccordion", () => {
  it("renderuje tytuł i ikonę, treść jest domyślnie ukryta", () => {
    renderAccordion();

    expect(screen.getByRole("button", { name: "Jak zacząć pracę" })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.queryByText("Treść sekcji pomocy")).not.toBeInTheDocument();
  });

  it("klik w nagłówek rozwija treść sekcji", async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(screen.getByRole("button", { name: "Jak zacząć pracę" }));

    expect(screen.getByText("Treść sekcji pomocy")).toBeInTheDocument();
  });

  it("ponowny klik zwija treść", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const header = screen.getByRole("button", { name: "Jak zacząć pracę" });
    await user.click(header);
    await user.click(header);

    expect(screen.queryByText("Treść sekcji pomocy")).not.toBeInTheDocument();
  });

  it("sekcje są niezależne — otwarcie jednej nie otwiera drugiej", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HelpAccordion title="Sekcja A" icon={<Info />}>
          <p>Treść A</p>
        </HelpAccordion>
        <HelpAccordion title="Sekcja B" icon={<Info />}>
          <p>Treść B</p>
        </HelpAccordion>
      </>
    );

    await user.click(screen.getByRole("button", { name: "Sekcja A" }));

    expect(screen.getByText("Treść A")).toBeInTheDocument();
    expect(screen.queryByText("Treść B")).not.toBeInTheDocument();
  });
});
