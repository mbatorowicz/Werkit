"use client";

import { Trash2, Edit2, MapPin } from "lucide-react";
import type { AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { ListSearchBar } from "@/components/ListSearchBar";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { formatCustomerAddressDisplay } from "@/lib/customerAddress";
import { formatCustomerLabel } from "@/lib/customerSearch";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTIONS,
  TABLE_CELL_NAME,
  TABLE_CELL_SUBTITLE,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_ROW_CLICKABLE,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";

interface CustomersTableProps {
  customers: AdminCustomerListRow[];
  filteredCustomers: AdminCustomerListRow[];
  searchQuery: string;
  isLoading: boolean;
  canMutate: boolean;
  onSearchChange: (q: string) => void;
  onPreview: (customer: AdminCustomerListRow) => void;
  onEdit: (customer: AdminCustomerListRow) => void;
  onDelete: (id: number) => void;
  dict: Record<string, string>;
  machinesDict: Record<string, string>;
}

export default function CustomersTable({
  customers,
  filteredCustomers,
  searchQuery,
  isLoading,
  canMutate,
  onSearchChange,
  onPreview,
  onEdit,
  onDelete,
  dict,
  machinesDict,
}: CustomersTableProps) {
  const colSpan = canMutate ? 3 : 2;

  return (
    <>
      <ListSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={dict.listSearchPlaceholder}
      />

      <AdminTableShell minWidthClass="min-w-[600px]">
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.customerData}</th>
            <th className={TABLE_TH}>{dict.defaultAddress}</th>
            {canMutate ? <th className={TABLE_TH_RIGHT}>{machinesDict.management}</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
                {dict.fetching}
              </td>
            </tr>
          ) : customers.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
                {dict.noCustomers}
              </td>
            </tr>
          ) : filteredCustomers.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
                {dict.listSearchNoResults}
              </td>
            </tr>
          ) : (
            filteredCustomers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => onPreview(customer)}
                className={TABLE_ROW_CLICKABLE}
              >
                <td className={TABLE_TD}>
                  <div className={TABLE_CELL_NAME}>{formatCustomerLabel(customer)}</div>
                  <div className={TABLE_CELL_SUBTITLE}>ID: #{customer.id}</div>
                </td>
                <td className={TABLE_TD}>
                  {customer.defaultAddress ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="whitespace-pre-wrap">
                        {formatCustomerAddressDisplay(customer.defaultAddress)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-zinc-500">{dict.noAddress}</span>
                  )}
                </td>
                {canMutate ? (
                  <td className={TABLE_TD_RIGHT}>
                    <div className={TABLE_ACTIONS}>
                      <button
                        type="button"
                        onClick={(e) => {
                          stopRowActionClick(e);
                          onEdit(customer);
                        }}
                        className={TABLE_ACTION_ICON_EDIT}
                        title={machinesDict.editTitle}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          stopRowActionClick(e);
                          onDelete(customer.id);
                        }}
                        className={TABLE_ACTION_ICON_DELETE}
                        title={machinesDict.deleteTitle}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </AdminTableShell>
    </>
  );
}
