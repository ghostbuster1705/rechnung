# InvoiceDE

InvoiceDE ist eine Next.js-14 SaaS-Anwendung für deutsche B2B-Rechnungen mit **ZUGFeRD 2.1 BASIC** XML-Generierung (EN 16931), PDF-Erstellung mit eingebettetem `factur-x.xml`, Multi-Tenancy, Stripe-Abos und Kundenverwaltung.

## Tech Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS
- Prisma ORM + PostgreSQL
- NextAuth.js v5 (Credentials + Google OAuth)
- Zod + react-hook-form
- pdf-lib (PDF + XML Attachment)
- Stripe Checkout + Webhooks
- Resend/Nodemailer für Rechnungsmails

## Schnellstart

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run db:push
npm run seed
npm run dev
```

Demo-Login nach Seed:

- E-Mail: `demo@invoicede.local`
- Passwort: `DemoPass123`

## Relevante Routen

- `/login`, `/register`
- `/invoices` (Liste)
- `/invoices/new` (Rechnungserstellung)
- `/clients`
- `/settings`

## APIs

- `POST /api/invoices` – Rechnung speichern
- `POST /api/invoices/generate` – PDF + ZUGFeRD XML erzeugen
- `POST /api/invoices/send` – Rechnung per E-Mail versenden
- `POST /api/stripe/checkout` – Checkout-Session
- `POST /api/webhooks/stripe` – Stripe Webhook

## CI / Validierung

GitHub Actions Workflow (`.github/workflows/ci.yml`) enthält:

- Lint + Build
- `scripts/validate-zugferd.ts` (Strukturprüfung)
- Optional Validator-API-Aufruf über:
  - `ZUGFERD_VALIDATOR_ENDPOINT`
  - `ZUGFERD_VALIDATOR_TOKEN`

## Hinweise zu Compliance

- GoBD-Ansatz: Keine Lösch-API für Rechnungen, Audit-Log-Modell vorhanden.
- Pflichtangaben gemäß UStG §14 sind im Rechnungsformular abgebildet.
- Kleinunternehmer- und Reverse-Charge-Hinweise werden in XML/PDF berücksichtigt.

> Für echte Produktionsfreigabe sollten zusätzlich externe Schematron-Validierung, PDF/A-Preflight und revisionssichere Speicherung (WORM/Audit-Trail) aktiviert werden.
