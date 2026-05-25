"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Organization = {
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
  logo: string | null;
  defaultVatRate: number;
  invoiceNumberPattern: string;
  defaultPaymentTermDays: number;
  emailFooter: string | null;
  kleinunternehmerMode: boolean;
  plan: "FREE" | "PRO" | "BUSINESS";
};

type Props = {
  organization: Organization;
};

export function SettingsForm({ organization }: Props) {
  const [form, setForm] = useState({
    ...organization,
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
    logo: organization.logo || "",
    emailFooter: organization.emailFooter || "",
  });
  const [loading, setLoading] = useState(false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          defaultVatRate: Number(form.defaultVatRate),
          defaultPaymentTermDays: Number(form.defaultPaymentTermDays),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Einstellungen konnten nicht gespeichert werden.");
      }

      toast.success("Einstellungen gespeichert.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async (plan: "PRO" | "BUSINESS") => {
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout konnte nicht gestartet werden.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout fehlgeschlagen.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-sm text-slate-400">Aktueller Plan</p>
        <p className="text-lg font-semibold">{form.plan}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => startCheckout("PRO")} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
            Auf Pro upgraden (€9,99)
          </button>
          <button onClick={() => startCheckout("BUSINESS")} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
            Auf Business upgraden (€24,99)
          </button>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2 lg:grid-cols-3">
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Firmenname" required />
        <input className="input" value={form.vatId} onChange={(e) => setForm({ ...form, vatId: e.target.value })} placeholder="USt-IdNr" />
        <input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="Steuernummer" />

        <input className="input lg:col-span-2" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="Straße" />
        <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Land" />
        <input className="input" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="PLZ" />
        <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ort" />
        <input className="input" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="IBAN" />
        <input className="input" value={form.bic} onChange={(e) => setForm({ ...form, bic: e.target.value })} placeholder="BIC" />
        <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-Mail" />
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" />
        <input className="input" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="Logo URL (Cloudinary/S3)" />

        <select
          className="input"
          value={form.defaultVatRate}
          onChange={(e) => setForm({ ...form, defaultVatRate: Number(e.target.value) })}
        >
          <option value={19}>19% MwSt</option>
          <option value={7}>7% MwSt</option>
          <option value={0}>0% MwSt</option>
        </select>

        <input
          className="input"
          value={form.invoiceNumberPattern}
          onChange={(e) => setForm({ ...form, invoiceNumberPattern: e.target.value })}
          placeholder="Rechnungsnummer-Muster"
        />

        <input
          className="input"
          type="number"
          min={1}
          max={120}
          value={form.defaultPaymentTermDays}
          onChange={(e) => setForm({ ...form, defaultPaymentTermDays: Number(e.target.value) })}
          placeholder="Zahlungsziel (Tage)"
        />

        <textarea
          className="input lg:col-span-3"
          rows={3}
          value={form.emailFooter}
          onChange={(e) => setForm({ ...form, emailFooter: e.target.value })}
          placeholder="E-Mail Footer"
        />

        <label className="lg:col-span-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.kleinunternehmerMode}
            onChange={(e) => setForm({ ...form, kleinunternehmerMode: e.target.checked })}
          />
          Kleinunternehmermodus aktivieren (§19 UStG)
        </label>

        <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-60">
          {loading ? "Speichere..." : "Einstellungen speichern"}
        </button>
      </form>
    </div>
  );
}
