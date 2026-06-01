"use client";

interface StockReceiptFormProps {
  rPartId: string;
  rQuantity: string;
  rUnitPrice: string;
  rInvoiceNumber: string;
  rNotes: string;
  onPartIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onInvoiceNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  dict: {
    part: string;
    partPlaceholder: string;
    quantity: string;
    quantityPlaceholder: string;
    unitPrice: string;
    unitPricePlaceholder: string;
    invoiceNumber: string;
    invoiceNumberPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
  };
}

export function StockReceiptForm({
  rPartId,
  rQuantity,
  rUnitPrice,
  rInvoiceNumber,
  rNotes,
  onPartIdChange,
  onQuantityChange,
  onUnitPriceChange,
  onInvoiceNumberChange,
  onNotesChange,
  dict,
}: StockReceiptFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="space-y-4"
      id="receipt-form"
    >
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.part}
        </label>
        <input
          type="number"
          value={rPartId}
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
          value={rQuantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder={dict.quantityPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.unitPrice}
        </label>
        <input
          type="text"
          value={rUnitPrice}
          onChange={(e) => onUnitPriceChange(e.target.value)}
          placeholder={dict.unitPricePlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.invoiceNumber}
        </label>
        <input
          type="text"
          value={rInvoiceNumber}
          onChange={(e) => onInvoiceNumberChange(e.target.value)}
          placeholder={dict.invoiceNumberPlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {dict.notes}
        </label>
        <textarea
          value={rNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={dict.notesPlaceholder}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>
    </form>
  );
}
