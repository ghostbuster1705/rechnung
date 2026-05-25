import { z } from "zod";

export const vatRateSchema = z.union([z.literal(19), z.literal(7), z.literal(0)]);

const addressCoreSchema = z.object({
  name: z.string().min(2, "Name/Firma ist erforderlich."),
  street: z.string().min(2, "Straße ist erforderlich."),
  postalCode: z.string().min(4, "PLZ ist erforderlich."),
  city: z.string().min(2, "Ort ist erforderlich."),
  country: z.string().min(2, "Land ist erforderlich."),
  email: z
    .string()
    .email("Bitte eine gültige E-Mail eingeben.")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  vatId: z.string().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
});

export const sellerSchema = addressCoreSchema
  .extend({
    iban: z.string().min(8, "IBAN ist erforderlich."),
    bic: z.string().min(6, "BIC ist erforderlich."),
  })
  .refine(
    (value) => Boolean(value.vatId?.trim() || value.taxId?.trim()),
    "Steuernummer oder USt-IdNr ist erforderlich.",
  );

export const buyerSchema = addressCoreSchema;

export const lineItemSchema = z.object({
  description: z.string().min(2, "Beschreibung ist erforderlich."),
  quantity: z.number().positive("Menge muss größer als 0 sein."),
  unit: z.string().min(1, "Einheit ist erforderlich."),
  unitPriceNet: z.number().nonnegative("Preis darf nicht negativ sein."),
  vatRate: vatRateSchema,
});

export const invoiceMetaSchema = z.object({
  issueDate: z.string().min(1, "Rechnungsdatum ist erforderlich."),
  deliveryDate: z.string().min(1, "Leistungsdatum ist erforderlich."),
  dueDate: z.string().min(1, "Fälligkeitsdatum ist erforderlich."),
  paymentTerms: z.string().min(1, "Zahlungsbedingungen sind erforderlich."),
  reference: z.string().optional().or(z.literal("")),
  currency: z.literal("EUR"),
});

export const invoiceFormSchema = z.object({
  clientId: z.string().optional().or(z.literal("")),
  seller: sellerSchema,
  buyer: buyerSchema,
  invoice: invoiceMetaSchema,
  lineItems: z.array(lineItemSchema).min(1, "Mindestens eine Position ist erforderlich."),
  notes: z.string().optional().or(z.literal("")),
  reverseCharge: z.boolean(),
  kleinunternehmerMode: z.boolean(),
});

export const invoiceGenerateSchema = invoiceFormSchema.extend({
  number: z.string().min(1),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceGenerateValues = z.infer<typeof invoiceGenerateSchema>;
export type InvoiceLineItem = z.infer<typeof lineItemSchema>;
