"use client";

import { Trash2, Edit2, MapPin } from "lucide-react";
import type { AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { ListSearchBar } from "@/components/ListSearchBar";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { formatCustomerAddressDisplay } from "@/lib/customerAddress";
import { formatCustomerLabel } from "@/lib/customerSearch";

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
  return (
    <>
      <ListSearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={dict.listSearchPlaceholder}
      />

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className={INLINE_SCROLL_X_PANEL_CLASS}>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {dict.customerData}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {dict.defaultAddress}
                </th>
                {canMutate && (
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    {machinesDict.management}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canMutate ? 3 : 2}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm"
                  >
                    {dict.fetching}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onPreview(customer)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-200">
                        {formatCustomerLabel(customer)}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
                        ID: #{customer.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.defaultAddress ? (
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="whitespace-pre-wrap">
                            {formatCustomerAddressDisplay(customer.defaultAddress)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic text-xs">{dict.noAddress}</span>
                      )}
                    </td>
                    {canMutate && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              stopRowActionClick(e);
                              onEdit(customer);
                            }}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition"
                            title={machinesDict.editTitle}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              stopRowActionClick(e);
                              onDelete(customer.id);
                            }}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            title={machinesDict.deleteTitle}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {!isLoading && customers.length === 0 && (
                <tr>
                  <td
                    colSpan={canMutate ? 3 : 2}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm"
                  >
                    {dict.noCustomers}
                  </td>
                </tr>
              )}
              {!isLoading && customers.length > 0 && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={canMutate ? 3 : 2}
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
