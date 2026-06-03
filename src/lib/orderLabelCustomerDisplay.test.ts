import { describe, expect, it } from "vitest";
import { buildOrderLabelCustomerDisplay } from "./orderLabelCustomerDisplay";

describe("buildOrderLabelCustomerDisplay", () => {
  it("składa nazwę z nazwiska i imienia oraz parsuje adres", () => {
    const r = buildOrderLabelCustomerDisplay({
      customerLastName: "TEKMAR",
      customerFirstName: "",
      customerPhone: "123",
      customerAddress: "ul. Test\nWarszawa\n00-001",
    });
    expect(r.customerName).toBe("TEKMAR");
    expect(r.customerPhone).toBe("123");
    expect(r.hasAddress).toBe(true);
    expect(r.addressParts.street).toBe("ul. Test");
    expect(r.addressParts.postalCode).toBe("00-001");
    expect(r.addressParts.city).toBe("Warszawa");
  });

  it("preferuje customerName gdy podane", () => {
    const r = buildOrderLabelCustomerDisplay({
      customerName: "Firma Sp. z o.o.",
      customerLastName: "Ignorowane",
      customerFirstName: "X",
    });
    expect(r.customerName).toBe("Firma Sp. z o.o.");
  });
});
