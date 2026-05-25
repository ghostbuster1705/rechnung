"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
      return;
    }

    toast.success("Erfolgreich eingeloggt.");
    router.push("/invoices");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h1 className="text-xl font-semibold">Anmelden</h1>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="input"
          placeholder="name@firma.de"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">Passwort</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="input"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {loading ? "Anmeldung läuft..." : "Anmelden"}
      </button>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/invoices" })}
        className="w-full rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
      >
        Mit Google anmelden
      </button>

      <p className="text-sm text-slate-400">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-emerald-400 hover:underline">
          Jetzt registrieren
        </Link>
      </p>
    </form>
  );
}
