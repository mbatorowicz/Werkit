import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ResourceFormModal } from "@/features/admin/machines/ResourceFormModal";
import { createEmptyMachineForm } from "@/features/admin/machines/types";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const dict = plDict.admin.machines;

const resourceVis = {
  showResourceName: true,
  showResourceDescription: true,
  showRegistrationNumber: true,
};

describe("ResourceFormModal", () => {
  it("zawsze pokazuje pole typu zasobu — niezależnie od modułu DUR", () => {
    renderWithProviders(
      <ResourceFormModal
        open
        onClose={vi.fn()}
        isEdit={false}
        dict={dict}
        resourceVis={resourceVis}
        categories={[]}
        resourceGroups={[{ id: 1, name: "Kapsułkarka 02A" }]}
        form={createEmptyMachineForm()}
        setForm={vi.fn()}
        onSubmit={vi.fn()}
        onPhotoPick={vi.fn()}
      />
    );

    expect(screen.getByLabelText(dict.resourceGroupLabel)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kapsułkarka 02A" })).toBeInTheDocument();
  });
});
