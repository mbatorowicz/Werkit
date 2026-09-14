import { describe, expect, it } from "vitest";
import { filterHelpSections } from "./filterSections";
import { helpPl } from "@/i18n/locales/help/pl";

describe("filterHelpSections", () => {
  const sections = [
    { id: "a", title: "A", paragraphs: ["p1"] },
    { id: "b", title: "B", paragraphs: ["p2"] },
  ];

  it("returns all sections when exclude list is empty", () => {
    expect(filterHelpSections(sections)).toHaveLength(2);
    expect(filterHelpSections(sections, [])).toHaveLength(2);
  });

  it("omits sections by id", () => {
    expect(filterHelpSections(sections, ["b"])).toEqual([sections[0]]);
  });
});

describe("admin help IA — dwa magazyny", () => {
  it("stawia części zamienne zaraz po materiałach", () => {
    const ids = helpPl.admin.sections.map((section) => section.id);
    const materialsIdx = ids.indexOf("materials");
    expect(ids[materialsIdx + 1]).toBe("dur-warehouse");
    expect(ids[materialsIdx + 2]).toBe("customers");
  });
});
