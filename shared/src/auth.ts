import { z } from "zod";

/**
 * The password rules, in the order the Create account screen lists them.
 *
 * The form renders this array as its live checklist and the schema below is
 * built from the same array, so the dots a user watches turn green and the
 * rules the API actually enforces cannot drift apart. The labels are the
 * design's wording verbatim, because they are shown to the user as-is.
 */
export const passwordRules = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "variety",
    label: "One number or symbol",
    test: (value: string) => /[\p{N}\p{P}\p{S}]/u.test(value),
  },
] as const;

export const passwordSchema = passwordRules.reduce<z.ZodType<string>>(
  (schema, rule) => schema.refine(rule.test, rule.label),
  z.string(),
);

/**
 * Trimmed and lowercased before it is validated, so `Graeme@mail.com` and
 * `graeme@mail.com` can never become two accounts. Both register and login
 * use this, which is what makes the normalisation reliable — normalising on
 * only one of them means an address that can be registered but not logged in.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(80, "That name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Login deliberately does not apply the password rules — only that something
 * was typed. Rules change over time, and enforcing today's rules at login
 * would lock out an account whose password predates them. It would also tell
 * an attacker which candidate passwords are not worth trying.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
