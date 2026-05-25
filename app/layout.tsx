import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/toaster-provider";

export const metadata: Metadata = {
  title: "InvoiceDE",
  description: "SaaS für GoBD- und ZUGFeRD-konforme Rechnungen in Deutschland",
};

const themeScript = `
(function() {
  const saved = localStorage.getItem('theme');
  const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
