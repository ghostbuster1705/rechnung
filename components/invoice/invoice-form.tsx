"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import { LineItemsTable } from "@/components/invoice/line-items-table";
import { calculateInvoiceTotals } from "@/lib/invoice/calculations";
import { invoiceFormSchema, InvoiceFormValues } from "@/lib/validations/invoice";

type ClientOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string | null;
  taxId: string | null;
};

type OrganizationDefaults = {
  name: string;
  vatId: string | null;
  taxId: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  iban: string | null;
  bic: string | null;
  email: string | null;
  phone: string | null;
  defaultPaymentTermDays: number;
  defaultVatRate: number;
  kleinunternehmerMode: boolean;
};

type Props = {
  clients: ClientOption[];
  organization: OrganizationDefaults;
};

const todayIso = new Date().toISOString().slice(0, 10);

export function InvoiceForm({ clients, organization }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + organization.defaultPaymentTermDays);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: "",
      seller: {
        name: organization.name,
        vatId: organization.vatId || "",
        taxId: organization.taxId || "",
        street: organization.street || "",
        postalCode: organization.postalCode || "",
        city: organization.city || "",
        country: organization.country || "DE",
        iban: organization.iban || "",
        bic: organization.bic || "",
        email: organization.email || "",
        phone: organization.phone || "",
      },
      buyer: {
        name: "",
        street: "",
        postalCode: "",
        city: "",
        country: "DE",
        email: "",
        phone: "",
        vatId: "",
        taxId: "",
      },
      invoice: {
        issueDate: todayIso,
        deliveryDate: todayIso,
        dueDate: dueDate.toISOString().slice(0, 10),
        paymentTerms: `Zahlbar innerhalb von ${organization.defaultPaymentTermDays} Tagen ohne Abzug.`,
        reference: "",
        currency: "EUR",
      },
      lineItems: [
        {
          description: "",
          quantity: 1,
          unit: "Stk",
          unitPriceNet: 0,
          vatRate: organization.defaultVatRate as 0 | 7 | 19,
        },
      ],
      notes: "",
      reverseCharge: false,
      kleinunternehmerMode: organization.kleinunternehmerMode,
    },
  });

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const values = form.watch();
  const totals = useMemo(
    () =>
      calculateInvoiceTotals(values.lineItems || [], {
        kleinunternehmerMode: values.kleinunternehmerMode,
      }),
    [values.lineItems, values.kleinunternehmerMode],
  );

  const onClientChange = (clientId: string) => {
    form.setValue("clientId", clientId);
    const client = clientById.get(clientId);
    if (!client) return;

    form.setValue("buyer", {
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      street: client.street,
      postalCode: client.postalCode,
      city: client.city,
      country: client.country,
      vatId: client.vatId || "",
      taxId: client.taxId || "",
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const createResponse = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!createResponse.ok) {
        const payload = await createResponse.json();
        throw new Error(payload.error || "Rechnung konnte nicht gespeichert werden.");
      }

      const created = await createResponse.json();

      const pdfResponse = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(created.invoicePayload),
      });

      if (!pdfResponse.ok) {
        const payload = await pdfResponse.json();
        throw new Error(payload.error || "PDF konnte nicht erzeugt werden.");
      }

      const blob = await pdfResponse.blob();
      const fileUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = `${created.invoice.number}.pdf`;
      a.click();
      URL.revokeObjectURL(fileUrl);

      toast.success("Rechnung erstellt und PDF heruntergeladen.");
      router.push(`/invoices/${created.invoice.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Erstellen der Rechnung.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-base font-semibold">Verkäufer</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <input {...form.register("seller.name")} placeholder="Firmenname" className="input" />
            <input {...form.register("seller.vatId")} placeholder="USt-IdNr" className="input" />
            <input {...form.register("seller.taxId")} placeholder="Steuernummer" className="input" />
            <input {...form.register("seller.email")} placeholder="E-Mail" className="input" />
            <input {...form.register("seller.phone")} placeholder="Telefon" className="input" />
            <input {...form.register("seller.country")} placeholder="Land" className="input" />
            <input {...form.register("seller.street")} placeholder="Straße" className="input md:col-span-2" />
            <input {...form.register("seller.postalCode")} placeholder="PLZ" className="input" />
            <input {...form.register("seller.city")} placeholder="Ort" className="input" />
            <input {...form.register("seller.iban")} placeholder="IBAN" className="input" />
            <input {...form.register("seller.bic")} placeholder="BIC" className="input" />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-base font-semibold">Käufer</h3>
          <select
            className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={values.clientId || ""}
            onChange={(event) => onClientChange(event.target.value)}
          >
            <option value="">Kunde auswählen (optional)</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <div className="grid gap-2 md:grid-cols-2">
            <input {...form.register("buyer.name")} placeholder="Firmenname" className="input" />
            <input {...form.register("buyer.vatId")} placeholder="USt-IdNr" className="input" />
            <input {...form.register("buyer.taxId")} placeholder="Steuernummer" className="input" />
            <input {...form.register("buyer.email")} placeholder="E-Mail" className="input" />
            <input {...form.register("buyer.phone")} placeholder="Telefon" className="input" />
            <input {...form.register("buyer.country")} placeholder="Land" className="input" />
            <input {...form.register("buyer.street")} placeholder="Straße" className="input md:col-span-2" />
            <input {...form.register("buyer.postalCode")} placeholder="PLZ" className="input" />
            <input {...form.register("buyer.city")} placeholder="Ort" className="input" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2 lg:grid-cols-3">
        <input type="date" {...form.register("invoice.issueDate")} className="input" />
        <input type="date" {...form.register("invoice.deliveryDate")} className="input" />
        <input type="date" {...form.register("invoice.dueDate")} className="input" />
        <input {...form.register("invoice.paymentTerms")} placeholder="Zahlungsbedingungen" className="input lg:col-span-2" />
        <input {...form.register("invoice.reference")} placeholder="Referenz/Bestellnummer" className="input" />
        <textarea {...form.register("notes")} placeholder="Hinweistext" className="input lg:col-span-3" rows={2} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("kleinunternehmerMode")} />
          Kleinunternehmerregelung (§19 UStG)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("reverseCharge")} />
          Reverse Charge
        </label>
      </section>

      <LineItemsTable
        fields={fields}
        append={append}
        remove={remove}
        register={form.register}
        errors={form.formState.errors}
      />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div>
          {form.formState.errors.root?.message && (
            <p className="text-sm text-red-400">{form.formState.errors.root.message}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? "Erstelle Rechnung..." : "Rechnung erstellen"}
          </button>
        </div>

        <InvoicePreview values={values} totals={totals} />
      </div>
    </form>
  );
}
