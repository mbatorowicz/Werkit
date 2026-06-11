import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecimalInput } from "@/components/DecimalInput";

function Harness({ onChangeSpy }: { onChangeSpy?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <DecimalInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChangeSpy?.(v);
      }}
      aria-label="Ilość"
    />
  );
}

describe("DecimalInput", () => {
  it("renderuje pole tekstowe z trybem dziesiętnym", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Ilość");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("akceptuje liczbę z przecinkiem", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Ilość"), "12,5");

    expect(screen.getByLabelText("Ilość")).toHaveValue("12,5");
  });

  it("akceptuje liczbę z kropką", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Ilość"), "3.75");

    expect(screen.getByLabelText("Ilość")).toHaveValue("3.75");
  });

  it("odrzuca litery i znaki specjalne", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Ilość"), "1a2b-3!");

    expect(screen.getByLabelText("Ilość")).toHaveValue("123");
  });

  it("pozwala tylko na jeden separator dziesiętny", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Ilość"), "1,2.3,4");

    expect(screen.getByLabelText("Ilość")).toHaveValue("1,234");
  });

  it("przekazuje oczyszczoną wartość do onChange", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);

    await user.type(screen.getByLabelText("Ilość"), "x9");

    expect(spy).toHaveBeenLastCalledWith("9");
  });
});
