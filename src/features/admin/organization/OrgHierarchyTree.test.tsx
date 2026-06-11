import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OrgHierarchyTree,
  type OrgTreeLabels,
} from "@/features/admin/organization/OrgHierarchyTree";
import type { DepartmentTreeNode, TeamWithMembers } from "@/types/organization";
import { renderWithProviders } from "@/test/renderWithProviders";

const labels: OrgTreeLabels = {
  searchPlaceholder: "Szukaj w strukturze…",
  searchNoResults: "Brak wyników w strukturze.",
  emptyTree: "Brak działów w organizacji.",
  unassignedTitle: "Nieprzypisani pracownicy",
  unassignedEmpty: "Wszyscy pracownicy są przypisani.",
  addDepartment: "Dodaj dział",
  addTeam: "Dodaj zespół",
  addMember: "Dodaj członka",
  addAccount: "Dodaj konto",
  roleLeader: "Lider zespołu",
  roleMember: "Członek zespołu",
  deptBadge: "Dział",
  teamBadge: "Zespół",
};

const team: TeamWithMembers = {
  id: 10,
  companyId: 1,
  departmentId: 1,
  name: "Brygada A",
  leaderId: null,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  members: [
    {
      id: 100,
      teamId: 10,
      userId: 7,
      role: "leader",
      joinedAt: new Date("2026-01-02"),
      user: { id: 7, fullName: "Jan Kowalski", usernameEmail: "jan_k" },
    },
  ],
};

const childDept: DepartmentTreeNode = {
  id: 2,
  companyId: 1,
  name: "Serwis",
  parentId: 1,
  managerId: null,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  children: [],
  teams: [],
};

const tree: DepartmentTreeNode[] = [
  {
    id: 1,
    companyId: 1,
    name: "Logistyka",
    parentId: null,
    managerId: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    children: [childDept],
    teams: [team],
  },
];

function makeProps() {
  return {
    tree,
    unassignedUsers: [] as { id: number; fullName: string; role: string }[],
    isLoading: false,
    canMutate: true,
    canManageAccounts: false,
    labels,
    onAddDepartment: vi.fn(),
    onEditDepartment: vi.fn(),
    onDeleteDepartment: vi.fn(),
    onAddTeam: vi.fn(),
    onEditTeam: vi.fn(),
    onDeleteTeam: vi.fn(),
    onAddMember: vi.fn(),
    onDeleteMember: vi.fn(),
    onOpenUser: vi.fn(),
    onAddAccount: vi.fn(),
  };
}

describe("OrgHierarchyTree", () => {
  it("renderuje dział z badge, a zespoły są domyślnie zwinięte", () => {
    renderWithProviders(<OrgHierarchyTree {...makeProps()} />);

    expect(screen.getByText("Logistyka")).toBeInTheDocument();
    expect(screen.getByText(labels.deptBadge)).toBeInTheDocument();
    expect(screen.queryByText("Brygada A")).not.toBeInTheDocument();
    expect(screen.queryByText("Serwis")).not.toBeInTheDocument();
  });

  it("rozwija dział do zespołów i pod-działów, a zespół do członków", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrgHierarchyTree {...makeProps()} />);

    const deptToggle = screen.getByRole("button", { expanded: false });
    await user.click(deptToggle);
    expect(screen.getByText("Brygada A")).toBeInTheDocument();
    expect(screen.getByText("Serwis")).toBeInTheDocument();
    expect(screen.queryByText("Jan Kowalski")).not.toBeInTheDocument();

    const teamToggle = screen.getByRole("button", { expanded: false });
    await user.click(teamToggle);
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText(labels.roleLeader)).toBeInTheDocument();

    // Zwijanie działu chowa całe poddrzewo.
    await user.click(deptToggle);
    expect(screen.queryByText("Brygada A")).not.toBeInTheDocument();
  });

  it("klik w członka zespołu woła onOpenUser z id użytkownika", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<OrgHierarchyTree {...props} />);

    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByRole("button", { name: /Jan Kowalski/ }));

    expect(props.onOpenUser).toHaveBeenCalledWith(7);
  });

  it("wyszukiwanie automatycznie rozwija drzewo i filtruje wyniki", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrgHierarchyTree {...makeProps()} />);

    const search = screen.getByRole("searchbox");
    await user.type(search, "Jan");
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nie-ma-takiego");
    expect(screen.getByText(labels.searchNoResults)).toBeInTheDocument();
  });

  it("sekcja nieprzypisanych rozwija się i otwiera profil użytkownika", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(
      <OrgHierarchyTree
        {...props}
        tree={[]}
        canManageAccounts
        unassignedUsers={[{ id: 5, fullName: "Anna Nowak", role: "worker" }]}
      />
    );

    expect(screen.getByText(labels.unassignedTitle)).toBeInTheDocument();
    expect(screen.queryByText("Anna Nowak")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByRole("button", { name: /Anna Nowak/ }));
    expect(props.onOpenUser).toHaveBeenCalledWith(5);
  });

  it("pusta sekcja nieprzypisanych pokazuje komunikat po rozwinięciu", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrgHierarchyTree {...makeProps()} canManageAccounts />);

    const toggles = screen.getAllByRole("button", { expanded: false });
    await user.click(toggles[toggles.length - 1]);
    expect(screen.getByText(labels.unassignedEmpty)).toBeInTheDocument();
  });

  it("przyciski dodawania działu i konta wołają callbacki", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<OrgHierarchyTree {...props} canManageAccounts />);

    await user.click(screen.getByRole("button", { name: labels.addDepartment }));
    expect(props.onAddDepartment).toHaveBeenCalledWith(null);

    await user.click(screen.getByRole("button", { name: labels.addAccount }));
    expect(props.onAddAccount).toHaveBeenCalledTimes(1);
  });

  it("bez uprawnień ukrywa przyciski, a puste drzewo pokazuje komunikat", () => {
    renderWithProviders(
      <OrgHierarchyTree {...makeProps()} tree={[]} canMutate={false} canManageAccounts={false} />
    );

    expect(screen.queryByText(labels.addDepartment)).not.toBeInTheDocument();
    expect(screen.queryByText(labels.addAccount)).not.toBeInTheDocument();
    expect(screen.getByText(labels.emptyTree)).toBeInTheDocument();
  });
});
