import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, passwordRules } from "./auth.js";

const validRegistration = {
  name: "Maria Santos",
  email: "maria.santos@email.com",
  password: "reading1",
};

describe("registerSchema", () => {
  it("lowercases and trims the email", () => {
    const result = registerSchema.parse({
      ...validRegistration,
      email: "  Maria.Santos@Email.com  ",
    });
    expect(result.email).toBe("maria.santos@email.com");
  });

  it("trims the name", () => {
    const result = registerSchema.parse({
      ...validRegistration,
      name: "  Maria Santos  ",
    });
    expect(result.name).toBe("Maria Santos");
  });

  it("rejects a name that is only whitespace", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      email: "maria.santos",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "read1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password of only letters", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "readingbooks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password whose only non-letter is an accent", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "réadingg"
    });
    expect(result.success).toBe(false)
  });

  it("rejects a password with a trailing white space", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "reading "
    });
    expect(result.success).toBe(false)
  });

  it("accepts a password satisfied by a symbol rather than a number", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "reading!",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("lowercases and trims the email, so it matches what register stored", () => {
    const result = loginSchema.parse({
      email: "  Maria.Santos@Email.com  ",
      password: "reading1",
    });
    expect(result.email).toBe("maria.santos@email.com");
  });

  it("accepts a password that would fail the register rules", () => {
    // Rules change; an existing account whose password predates them must
    // still be able to log in.
    const result = loginSchema.safeParse({
      email: "maria.santos@email.com",
      password: "old",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "maria.santos@email.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordRules", () => {
  it("matches the checklist the design shows", () => {
    expect(passwordRules.map((rule) => rule.label)).toEqual([
      "At least 8 characters",
      "One number or symbol",
    ]);
  });

  it("agrees with the schema on what is valid", () => {
    const password = "reading1";
    const allRulesPass = passwordRules.every((rule) => rule.test(password));
    const schemaAccepts = registerSchema.safeParse({
      ...validRegistration,
      password,
    }).success;
    expect(allRulesPass).toBe(schemaAccepts);
  });
});
