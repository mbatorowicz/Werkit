"use client";

import { Trash2, Shield, Edit2, Users, Eye } from "lucide-react";
import type { AdminUserListRow } from "@/lib/narrowApiListRows";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { ListSearchBar } from "@/components/ListSearchBar";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { PAGE_TITLE } from "@/lib/uiTypography";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTIONS,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_ROW_CLICKABLE,
  TABLE_TD,
  TABLE_TD_RIGHT,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";
import { OrgProfileBadges } from "@/components/organization/OrgProfileBadges";

interface UsersTableProps {
  users: AdminUserListRow[];
  filteredUsers: AdminUserListRow[];
  searchQuery: string;
  isLoading: boolean;
  canMutate: boolean;
  onSearchChange: (q: string) => void;
  onPreview: (user: AdminUserListRow) => void;
  onEdit: (user: AdminUserListRow) => void;
  onDelete: (id: number, name: string) => void;
  dict: Record<string, string>;
  orgLabels: { deptManager: string; teamLeader: string; teamMember: string };
  roleSubtitle: (role: string) => string;
}

export default function UsersTable({
  users,
  filteredUsers,
  searchQuery,
  isLoading,
  canMutate,
  onSearchChange,
  onPreview,
  onEdit,
  onDelete,
  dict,
  orgLabels,
  roleSubtitle,
}: UsersTableProps) {
  return (
    <>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className={`${PAGE_TITLE} flex items-center gap-2 pt-2`}>
            <Users className="h-6 w-6 text-emerald-500" /> {dict.pageTitle ?? dict.management}
          </h2>
        </div>
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={dict.listSearchPlaceholder}
      />

      <AdminTableShell minWidthClass="min-w-[600px]">
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.nameRole}</th>
            <th className={TABLE_TH}>{dict.systemLogin}</th>
            <th className={TABLE_TH_RIGHT}>{dict.management}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={3} className={TABLE_EMPTY_CELL}>
                {dict.fetching}
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={3} className={TABLE_EMPTY_CELL}>
                {dict.noUsers}
              </td>
            </tr>
          ) : filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={3} className={TABLE_EMPTY_CELL}>
                {dict.listSearchNoResults}
              </td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => onPreview(user)}
                className={TABLE_ROW_CLICKABLE}
              >
                <td className={TABLE_TD}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 font-bold text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {user.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-200">
                        {user.fullName}
                        {user.role === "admin" ? (
                          <Shield className="h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                        {user.role === "viewer" ? (
                          <Eye className="h-3.5 w-3.5 text-sky-500" />
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {roleSubtitle(user.role)}
                      </div>
                      <OrgProfileBadges
                        profile={user.orgProfile}
                        labels={orgLabels}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </td>
                <td className={TABLE_TD}>
                  <span className="rounded border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-sm tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    {user.usernameEmail}
                  </span>
                </td>
                <td className={TABLE_TD_RIGHT}>
                  {canMutate ? (
                    <div className={TABLE_ACTIONS}>
                      <button
                        type="button"
                        onClick={(e) => {
                          stopRowActionClick(e);
                          onEdit(user);
                        }}
                        className={TABLE_ACTION_ICON_EDIT}
                        title={dict.editTitle}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {user.role !== "admin" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            stopRowActionClick(e);
                            onDelete(user.id, user.fullName);
                          }}
                          className={TABLE_ACTION_ICON_DELETE}
                          title={dict.deleteTitle}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTableShell>
    </>
  );
}
