import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { OrganizationService } from "@/services/OrganizationService";
import { ResourceGroupService } from "@/services/dictionary/ResourceGroupService";
import { ResourceService } from "@/services/dictionary/ResourceService";
import {
  cleanupTestCompany,
  createTestCompany,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

type OrgTenant = {
  companyId: number;
  userId: number;
  deptId: number;
  teamId: number;
  groupId: number;
};

async function createOrgTenant(): Promise<OrgTenant> {
  const company = await createTestCompany();
  const user = await createTestUser(company.id);
  const dept = await OrganizationService.createDepartment(company.id, {
    name: `__ITEST dział ${uniqueTestSlug()}`,
  });
  const team = await OrganizationService.createTeam(company.id, {
    departmentId: dept.id,
    name: `__ITEST zespół ${uniqueTestSlug()}`,
  });
  const groupId = await ResourceGroupService.addGroup(company.id, {
    name: `__ITEST grupa ${uniqueTestSlug()}`,
  });
  return { companyId: company.id, userId: user.id, deptId: dept.id, teamId: team.id, groupId };
}

describe("Izolacja tenantów: organizacja + grupa maszyn (T2)", () => {
  let tenantA: OrgTenant;
  let tenantB: OrgTenant;

  beforeAll(async () => {
    tenantA = await createOrgTenant();
    tenantB = await createOrgTenant();
  });

  afterAll(async () => {
    await cleanupTestCompany(tenantA.companyId);
    await cleanupTestCompany(tenantB.companyId);
  });

  it("getTeam(A, teamB) zwraca null", async () => {
    await expect(
      OrganizationService.getTeam(tenantA.companyId, tenantB.teamId)
    ).resolves.toBeNull();
  });

  it("update/delete działu i zespołu firmy B z companyId A nie mutuje B", async () => {
    const updated = await OrganizationService.updateDepartment(
      tenantA.companyId,
      tenantB.deptId,
      { name: "Hacked" }
    );
    expect(updated).toBeUndefined();

    const stillB = await OrganizationService.getDepartment(tenantB.companyId, tenantB.deptId);
    expect(stillB?.name.startsWith("__ITEST")).toBe(true);

    const deletedDept = await OrganizationService.deleteDepartment(
      tenantA.companyId,
      tenantB.deptId
    );
    expect(deletedDept).toBeUndefined();
    await expect(
      OrganizationService.getDepartment(tenantB.companyId, tenantB.deptId)
    ).resolves.not.toBeNull();

    const deletedTeam = await OrganizationService.deleteTeam(tenantA.companyId, tenantB.teamId);
    expect(deletedTeam).toBeUndefined();
    await expect(
      OrganizationService.getTeam(tenantB.companyId, tenantB.teamId)
    ).resolves.not.toBeNull();
  });

  it("createTeam(A, departmentId z B) rzuca invalid_parent; drzewo B bez obcego zespołu", async () => {
    await expect(
      OrganizationService.createTeam(tenantA.companyId, {
        departmentId: tenantB.deptId,
        name: `__ITEST cross ${uniqueTestSlug()}`,
      })
    ).rejects.toThrow("invalid_parent");

    const treeB = await OrganizationService.getDepartmentTree(tenantB.companyId);
    const teamIds = treeB.flatMap((d) => d.teams.map((t) => t.id));
    expect(teamIds).toContain(tenantB.teamId);
    expect(teamIds).not.toContain(tenantA.teamId);
  });

  it("addTeamMember odrzuca zespół B i usera B w kontekście A", async () => {
    await expect(
      OrganizationService.addTeamMember(tenantA.companyId, {
        teamId: tenantB.teamId,
        userId: tenantA.userId,
      })
    ).rejects.toThrow("invalid_team");

    await expect(
      OrganizationService.addTeamMember(tenantA.companyId, {
        teamId: tenantA.teamId,
        userId: tenantB.userId,
      })
    ).rejects.toThrow("invalid_user");
  });

  it("ResourceService odrzuca grupę B; getGroup(B) nie zlicza maszyny A", async () => {
    await expect(
      ResourceService.addResource(
        tenantA.companyId,
        {
          name: `__ITEST maszyna ${uniqueTestSlug()}`,
          brand: "",
          model: "",
          registrationNumber: "",
        },
        [],
        null,
        tenantB.groupId
      )
    ).rejects.toThrow("invalid_resource_group");

    await db.insert(resources).values({
      companyId: tenantA.companyId,
      name: `__ITEST skewed ${uniqueTestSlug()}`,
      resourceGroupId: tenantB.groupId,
    });

    const groupB = await ResourceGroupService.getGroup(tenantB.companyId, tenantB.groupId);
    expect(groupB).not.toBeNull();
    expect(groupB!.resourceCount).toBe(0);

    const groupsB = await ResourceGroupService.getGroups(tenantB.companyId);
    const counted = groupsB.find((g) => g.id === tenantB.groupId);
    expect(counted?.resourceCount).toBe(0);
  });
});
