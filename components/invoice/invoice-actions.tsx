"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Props = {
  invoiceId: string;
  number: string;
  canPay: boolean;
};

export function InvoiceActions({ invoiceId, number, canPay }: Props) {
  const router = useRouter();

  const callAction = async (path: string) => {
    const response = await fetch(path, { method: "POST" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Aktion fehlgeschlagen.");
    }

    return payload;
  };

  const markPaid = async () => {
    try {
      await callAction(`/api/invoices/${invoiceId}/pay`);
      toast.success("Rechnung als bezahlt markiert.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler.");
    }
  };

  const duplicate = async () => {
    try {
      const payload = await callAction(`/api/invoices/${invoiceId}/duplicate`);
      toast.success("Rechnung dupliziert.");
      if (payload.invoiceId) {
        router.push(`/invoices/${payload.invoiceId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler.");
    }
  };

  const download = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Rechnung konnte nicht geladen werden.");
      }

      const payload = await response.json();
      const pdfResponse = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.invoicePayload),
      });

      if (!pdfResponse.ok) {
        throw new Error("PDF konnte nicht erzeugt werden.");
      }

      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download fehlgeschlagen.");
    }
  };

  const sendEmail = async () => {
    try {
      const response = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Versand fehlgeschlagen.");
      }
      toast.success("Rechnung per E-Mail versendet.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Versand fehlgeschlagen.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={download}
        className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
      >
        PDF
      </button>
      <button
        type="button"
        onClick={duplicate}
        className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
      >
        Duplizieren
      </button>
      <button
        type="button"
        onClick={sendEmail}
        className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
      >
        E-Mail senden
      </button>
      {canPay && (
        <button
          type="button"
          onClick={markPaid}
          className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
        >
          Als bezahlt markieren
        </button>
      )}
    </div>
  );
}
