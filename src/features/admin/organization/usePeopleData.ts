"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import {
  narrowOrganizationDepartments,
  narrowOrganizationTeams,
  narrowOrganizationTreePayload,
  type OrganizationDepartmentRow,
  type OrganizationTeamRow,
} from "@/lib/narrow/organization";
import { narrowAdminUserRows, type AdminUserListRow } from "@/lib/narrow/admin";
import type { OrganizationTreePayload } from "@/types/organization";

const EMPTY_TREE: OrganizationTreePayload = { tree: [], unassignedUsers: [] };

export interface PeopleData {
  treePayload: OrganizationTreePayload;
  departments: OrganizationDepartmentRow[];
  teams: OrganizationTeamRow[];
  users: AdminUserListRow[];
  workerUsers: AdminUserListRow[];
  isLoading: boolean;
  reloadAll: () => Promise<void>;
}

export function usePeopleData(): PeopleData {
  const [treePayload, setTreePayload] = useState<OrganizationTreePayload>(EMPTY_TREE);
  const [departments, setDepartments] = useState<OrganizationDepartmentRow[]>([]);
  const [teams, setTeams] = useState<OrganizationTeamRow[]>([]);
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [treeRes, deptRes, teamRes, userRes] = await Promise.all([
        fetchWithDeviceTelemetry(
          "Admin people: tree",
          adminApi.organization.tree,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: departments",
          adminApi.organization.departments,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: teams",
          adminApi.organization.teams,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: users",
          adminApi.users,
          { cache: "no-store" },
          { category: "admin" }
        ),
      ]);
      const treeBody = await parseJsonUnknown(treeRes);
      const tree = narrowOrganizationTreePayload(treeBody) ?? EMPTY_TREE;
      setTreePayload(tree);
      setDepartments(narrowOrganizationDepartments(await parseJsonArray(deptRes)));
      setTeams(narrowOrganizationTeams(await parseJsonArray(teamRes)));
      setUsers(narrowAdminUserRows(await parseJsonArray(userRes)));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void reloadAll();
    });
  }, [reloadAll]);

  const workerUsers = useMemo(
    () => users.filter((u) => u.isActive && (u.role === "worker" || u.role === "admin")),
    [users]
  );

  return { treePayload, departments, teams, users, workerUsers, isLoading, reloadAll };
}
