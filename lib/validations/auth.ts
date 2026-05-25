import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben."),
  organizationName: z
    .string()
    .min(2, "Firmenname muss mindestens 2 Zeichen haben."),
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  password: z
    .string()
    .min(8, "Passwort muss mindestens 8 Zeichen lang sein.")
    .regex(/[A-Z]/, "Passwort muss einen Großbuchstaben enthalten.")
    .regex(/[0-9]/, "Passwort muss eine Zahl enthalten."),
});

export const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  password: z.string().min(1, "Passwort ist erforderlich."),
});
