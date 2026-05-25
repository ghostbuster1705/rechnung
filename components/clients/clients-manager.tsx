"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type Client = {
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
  _count?: { invoices: number };
};

type Props = {
  initialClients: Client[];
};

const emptyForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  street: "",
  postalCode: "",
  city: "",
  country: "DE",
  vatId: "",
  taxId: "",
};

export function ClientsManager({ initialClients }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Kunde konnte nicht gespeichert werden.");
      }

      if (isEditing) {
        setClients((prev) => prev.map((entry) => (entry.id === payload.client.id ? payload.client : entry)));
        toast.success("Kunde aktualisiert.");
      } else {
        setClients((prev) => [payload.client, ...prev]);
        toast.success("Kunde erstellt.");
      }

      setForm(emptyForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Kunde konnte nicht gelöscht werden.");
      }

      setClients((prev) => prev.filter((entry) => entry.id !== id));
      toast.success("Kunde gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2 lg:grid-cols-3">
        <input className="input" placeholder="Firmenname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input lg:col-span-2" placeholder="Straße" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
        <input className="input" placeholder="Land" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
        <input className="input" placeholder="PLZ" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
        <input className="input" placeholder="Ort" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
        <input className="input" placeholder="USt-IdNr" value={form.vatId} onChange={(e) => setForm({ ...form, vatId: e.target.value })} />
        <input className="input" placeholder="Steuernummer" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />

        <div className="lg:col-span-3 flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-60">
            {isEditing ? "Kunde aktualisieren" : "Kunde speichern"}
          </button>
          {isEditing && (
            <button type="button" onClick={() => setForm(emptyForm)} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="px-3 py-2">Kunde</th>
              <th className="px-3 py-2">Kontakt</th>
              <th className="px-3 py-2">Adresse</th>
              <th className="px-3 py-2">Historie</th>
              <th className="px-3 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-900/60">
                <td className="px-3 py-2 font-medium">{client.name}</td>
                <td className="px-3 py-2 text-slate-300">
                  {client.email || "-"}
                  <br />
                  {client.phone || "-"}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {client.street}
                  <br />
                  {client.postalCode} {client.city}, {client.country}
                </td>
                <td className="px-3 py-2">{client._count?.invoices ?? 0} Rechnungen</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setForm({
                          id: client.id,
                          name: client.name,
                          email: client.email || "",
                          phone: client.phone || "",
                          street: client.street,
                          postalCode: client.postalCode,
                          city: client.city,
                          country: client.country,
                          vatId: client.vatId || "",
                          taxId: client.taxId || "",
                        })
                      }
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => onDelete(client.id)}
                      className="rounded-md border border-red-600/60 px-2 py-1 text-xs text-red-300 hover:bg-red-900/20"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={5}>
                  Noch keine Kunden vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
