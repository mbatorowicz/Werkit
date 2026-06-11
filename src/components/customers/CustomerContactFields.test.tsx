import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import {
  CustomerContactFields,
  type CustomerContactFieldLabels,
} from "@/components/customers/CustomerContactFields";
import { renderWithProviders } from "@/test/renderWithProviders";

const labels: CustomerContactFieldLabels = {
  customer: "Klient",
  streetLabel: "Ulica i numer",
  postalCodeLabel: "Kod pocztowy",
  cityLabel: "Miejscowość",
  phoneLabel: "Telefon",
  defaultAddressLabel: "Adres",
  noAddressValue: "Brak adresu",
};

const fullAddress = { street: "Polna 7", city: "Poznań", postalCode: "60-001" };
const emptyAddress = { street: "", city: "", postalCode: "" };

describe("CustomerContactFields", () => {
  it("wariant order renderuje nazwę klienta i wszystkie części adresu", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="order"
        labels={labels}
        customerName="Jan Kowalski"
        phone="123456789"
        addressParts={fullAddress}
      />
    );

    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText(labels.streetLabel)).toBeInTheDocument();
    expect(screen.getByText("Polna 7")).toBeInTheDocument();
    expect(screen.getByText(labels.postalCodeLabel)).toBeInTheDocument();
    expect(screen.getByText("60-001")).toBeInTheDocument();
    expect(screen.getByText(labels.cityLabel)).toBeInTheDocument();
    expect(screen.getByText("Poznań")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
  });

  it("wariant order z phoneAsLink renderuje link tel: z numerem bez spacji", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="order"
        labels={labels}
        customerName="Jan Kowalski"
        phone="+48 123 456 789"
        addressParts={emptyAddress}
        phoneAsLink
      />
    );

    const link = screen.getByRole("link", { name: "+48 123 456 789" });
    expect(link).toHaveAttribute("href", "tel:+48123456789");
  });

  it("wariant order pokazuje kreskę przy braku telefonu (domyślnie showPhoneWhenEmpty)", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="order"
        labels={labels}
        customerName="Jan Kowalski"
        phone={null}
        addressParts={emptyAddress}
      />
    );

    expect(screen.getByText(labels.phoneLabel)).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("wariant order ukrywa pole telefonu gdy showPhoneWhenEmpty=false i brak numeru", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="order"
        labels={labels}
        customerName="Jan Kowalski"
        phone={null}
        addressParts={emptyAddress}
        showPhoneWhenEmpty={false}
      />
    );

    expect(screen.queryByText(labels.phoneLabel)).not.toBeInTheDocument();
  });

  it("wariant order renderuje tylko wypełnione segmenty adresu", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="order"
        labels={labels}
        customerName="Jan Kowalski"
        phone={null}
        addressParts={{ street: "", city: "Poznań", postalCode: "" }}
      />
    );

    expect(screen.getByText(labels.cityLabel)).toBeInTheDocument();
    expect(screen.getByText("Poznań")).toBeInTheDocument();
    expect(screen.queryByText(labels.streetLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(labels.postalCodeLabel)).not.toBeInTheDocument();
  });

  it("wariant admin bez adresu pokazuje etykietę domyślną i tekst braku adresu", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="admin"
        labels={labels}
        customerName="Firma Budowlana"
        phone="123456789"
        addressParts={emptyAddress}
      />
    );

    expect(screen.getByText("Adres")).toBeInTheDocument();
    expect(screen.getByText("Brak adresu")).toBeInTheDocument();
    // Telefon w adminie jako tekst, nie link.
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("wariant admin pokazuje kreskę przy braku nazwy klienta", () => {
    renderWithProviders(
      <CustomerContactFields
        variant="admin"
        labels={labels}
        customerName={null}
        phone={null}
        addressParts={fullAddress}
      />
    );

    expect(screen.getByText(labels.customer)).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("Polna 7")).toBeInTheDocument();
  });
});
