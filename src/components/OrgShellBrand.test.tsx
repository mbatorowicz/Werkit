import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { OrgShellBrand } from "@/components/OrgShellBrand";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("OrgShellBrand", () => {
  it("pokazuje nazwę organizacji jako główny nagłówek, a produkt i build małym drukiem", () => {
    renderWithProviders(
      <OrgShellBrand companyName="CNC Solutions" productName="Werkit" version="1.9.4" />
    );

    expect(screen.getByRole("heading", { level: 1, name: "CNC Solutions" })).toBeInTheDocument();
    expect(screen.getByText("werkit")).toBeInTheDocument();
    expect(screen.getByText("v1.9.4")).toBeInTheDocument();
    expect(screen.queryByText("WERKIT")).not.toBeInTheDocument();
    expect(screen.getByText("werkit").closest("p")).toContainElement(screen.getByText("v1.9.4"));
  });

  it("ukrywa badge wersji, gdy nie podano version", () => {
    renderWithProviders(<OrgShellBrand companyName="Margaz" productName="Werkit" />);

    expect(screen.getByRole("heading", { level: 1, name: "Margaz" })).toBeInTheDocument();
    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
  });
});
