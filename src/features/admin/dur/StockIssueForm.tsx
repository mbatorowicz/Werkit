"use client";

interface StockIssueFormProps {
  iPartId: string;
  iQuantity: string;
  iWorkOrderId: string;
  iIssuedTo: string;
  iNotes: string;
  onPartIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onWorkOrderIdChange: (value: string) => void;
  onIssuedToChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  dict: {
    part: string;
    partPlaceholder: string;
    quantity: string;
    quantityPlaceholder: string;
    workOrder: string;
    workOrderPlaceholder: string;
    issuedTo: string;
    issuedToPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
  };
}

export function StockIssueForm({
  iPartId,
  iQuantity,
  iWorkOrderId,
  iIssuedTo,
  iNotes,
  onPartIdChange,
  onQuantityChange,
  onWorkOrderIdChange,
  onIssuedToChange,
  onNotesChange,
  dict,
}: StockIssueFormProps) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); }}
      className="space-y-4"
      id="issue-form"
    >
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.part}
        </label>
        <input
          type="number"
          value={iPartId}
          onChange={(e) => onPartIdChange(e.target.value)}
          placeholder={dict.partPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.quantity}
        </label>
        <input
          type="text"
          value={iQuantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder={dict.quantityPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.workOrder}
        </label>
        <input
          type="number"
          value={iWorkOrderId}
          onChange={(e) => onWorkOrderIdChange(e.target.value)}
          placeholder={dict.workOrderPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.issuedTo}
        </label>
        <input
          type="number"
          value={iIssuedTo}
          onChange={(e) => onIssuedToChange(e.target.value)}
          placeholder={dict.issuedToPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.notes}
        </label>
        <textarea
          value={iNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>
    </form>
  );
}
