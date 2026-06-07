"use client";

import { Trash2, Shield, Edit2, Users, Eye } from "lucide-react";
import type { AdminUserListRow } from "@/lib/narrowApiListRows";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { ListSearchBar } from "@/components/ListSearchBar";
import { PAGE_TITLE } from "@/lib/uiTypography";
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TH,
  TABLE_WRAPPER,
} from "@/lib/uiTable";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className={`${PAGE_TITLE} flex items-center gap-2 pt-2`}>
            <Users className="w-6 h-6 text-emerald-500" /> {dict.pageTitle ?? dict.management}
          </h2>
        </div>
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={dict.listSearchPlaceholder}
      />

      <div className={`${TABLE_WRAPPER} bg-white dark:bg-zinc-900 shadow-sm`}>
        <div className={INLINE_SCROLL_X_PANEL_CLASS}>
          <table className={`${TABLE_BASE} min-w-[600px]`}>
            <thead className={TABLE_HEAD}>
              <tr className={TABLE_HEAD_ROW}>
                <th className={TABLE_TH}>{dict.nameRole}</th>
                <th className={TABLE_TH}>{dict.systemLogin}</th>
                <th className={`${TABLE_TH} text-right`}>{dict.management}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className={TABLE_BODY_ROW}>
                  <td colSpan={3} className={`${TABLE_TD} py-12 text-center text-zinc-500`}>
                    {dict.fetching}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => onPreview(user)}
                    className={`cursor-pointer ${TABLE_BODY_ROW}`}
                  >
                    <td className={TABLE_TD}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 flex items-center justify-center text-emerald-700 dark:text-zinc-300 font-bold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                            {user.fullName}
                            {user.role === "admin" && (
                              <Shield className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {user.role === "viewer" && <Eye className="w-3.5 h-3.5 text-sky-500" />}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
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
                      <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded text-sm font-mono tracking-wide">
                        {user.usernameEmail}
                      </span>
                    </td>
                    <td className={`${TABLE_TD} text-right`}>
                      {canMutate && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              stopRowActionClick(e);
                              onEdit(user);
                            }}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                            title={dict.editTitle}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.role !== "admin" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                onDelete(user.id, user.fullName);
                              }}
                              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              title={dict.deleteTitle}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm"
                  >
                    {dict.noUsers}
                  </td>
                </tr>
              )}
              {!isLoading && users.length > 0 && filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm"
                  >
                    {dict.listSearchNoResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
