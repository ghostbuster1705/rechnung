import nodemailer from "nodemailer";
import { Resend } from "resend";

type SendInvoiceEmailInput = {
  to: string;
  subject: string;
  message: string;
  pdfBytes: Uint8Array;
  invoiceNumber: string;
};

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.INVOICE_MAIL_FROM || "rechnung@invoicede.app",
      to: input.to,
      subject: input.subject,
      text: input.message,
      attachments: [
        {
          filename: `Rechnung-${input.invoiceNumber}.pdf`,
          content: Buffer.from(input.pdfBytes).toString("base64"),
        },
      ],
    });

    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Keine E-Mail-Konfiguration vorhanden.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.INVOICE_MAIL_FROM || process.env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    text: input.message,
    attachments: [
      {
        filename: `Rechnung-${input.invoiceNumber}.pdf`,
        content: Buffer.from(input.pdfBytes),
      },
    ],
  });
}
