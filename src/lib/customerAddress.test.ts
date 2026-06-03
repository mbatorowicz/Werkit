import { describe, expect, it } from "vitest";
import {
  customerAddressGeocodeQuery,
  formatCustomerAddressDisplay,
  parseCustomerAddress,
  serializeCustomerAddress,
} from "./customerAddress";

describe("customerAddress", () => {
  it("serializes three lines", () => {
    expect(
      serializeCustomerAddress({
        street: "Orzeszowska 21",
        city: "Miedzna",
        postalCode: "07-106",
      })
    ).toBe("Orzeszowska 21\nMiedzna\n07-106");
  });

  it("parses three-line storage", () => {
    expect(parseCustomerAddress("Orzeszowska 21\nMiedzna\n07-106")).toEqual({
      street: "Orzeszowska 21",
      city: "Miedzna",
      postalCode: "07-106",
    });
  });

  it("parses legacy comma format with postal in second segment", () => {
    expect(parseCustomerAddress("Orzeszowska 21, 07-106 Miedzna")).toEqual({
      street: "Orzeszowska 21",
      city: "Miedzna",
      postalCode: "07-106",
    });
  });

  it("formats display lines", () => {
    expect(formatCustomerAddressDisplay("Orzeszowska 21\nMiedzna\n07-106")).toBe(
      "Orzeszowska 21\nMiedzna\n07-106"
    );
  });

  it("builds geocode query", () => {
    expect(
      customerAddressGeocodeQuery({
        street: "Orzeszowska 21",
        city: "Miedzna",
        postalCode: "07-106",
      })
    ).toBe("Orzeszowska 21, 07-106 Miedzna");
  });
});
