"use client";

import type {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { InvoiceFormValues } from "@/lib/validations/invoice";

type Props = {
  fields: UseFieldArrayReturn<InvoiceFormValues, "lineItems", "id">["fields"];
  append: UseFieldArrayReturn<InvoiceFormValues, "lineItems", "id">["append"];
  remove: UseFieldArrayReturn<InvoiceFormValues, "lineItems", "id">["remove"];
  register: UseFormRegister<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>;
};

export function LineItemsTable({ fields, append, remove, register, errors }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Rechnungspositionen</h3>
        <button
          type="button"
          onClick={() =>
            append({
              description: "",
              quantity: 1,
              unit: "Stk",
              unitPriceNet: 0,
              vatRate: 19,
            })
          }
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Position
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 rounded-lg border border-slate-800 p-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs text-slate-400">Beschreibung</label>
              <input
                {...register(`lineItems.${index}.description`)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Menge</label>
              <input
                type="number"
                step="0.01"
                {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Einheit</label>
              <input
                {...register(`lineItems.${index}.unit`)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Einzelpreis netto</label>
              <input
                type="number"
                step="0.01"
                {...register(`lineItems.${index}.unitPriceNet`, { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs text-slate-400">MwSt.</label>
              <select
                {...register(`lineItems.${index}.vatRate`, { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2"
              >
                <option value={19}>19%</option>
                <option value={7}>7%</option>
                <option value={0}>0%</option>
              </select>
            </div>
            <div className="flex items-end justify-end md:col-span-1">
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-md p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Position löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {errors.lineItems?.[index] && (
              <p className="text-xs text-red-400 md:col-span-12">Position enthält ungültige Werte.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
