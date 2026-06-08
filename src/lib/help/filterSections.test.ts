import { describe, expect, it } from "vitest";
import { filterHelpSections } from "./filterSections";

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
