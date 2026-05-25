"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organizationName,
          email,
          password,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Registrierung fehlgeschlagen.");
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        throw new Error("Konto erstellt, aber Anmeldung fehlgeschlagen.");
      }

      toast.success("Konto erfolgreich erstellt.");
      router.push("/invoices");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h1 className="text-xl font-semibold">Registrieren</h1>

      <input className="input" placeholder="Ihr Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input
        className="input"
        placeholder="Firmenname"
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
        required
      />
      <input
        className="input"
        placeholder="name@firma.de"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="input"
        placeholder="Sicheres Passwort"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {loading ? "Registrierung läuft..." : "Konto erstellen"}
      </button>

      <p className="text-sm text-slate-400">
        Bereits registriert?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Zum Login
        </Link>
      </p>
    </form>
  );
}
