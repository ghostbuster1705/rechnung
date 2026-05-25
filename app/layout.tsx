import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { ThemeInitializer } from "@/components/theme/theme-initializer";

export const metadata: Metadata = {
  title: "InvoiceDE",
  description: "SaaS für GoBD- und ZUGFeRD-konforme Rechnungen in Deutschland",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <ThemeInitializer />
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
