import { describe, it, expect } from "vitest";
import { assertTestDatabase } from "./resetDb.js";

describe("assertTestDatabase", () => {
  it("accepts a database whose name ends in _test", () => {
    expect(() =>
      assertTestDatabase(
        "postgres://postgres:postgres@localhost:5432/bookshelf_test",
      ),
    ).not.toThrow();
  });

  it("rejects the development database", () => {
    expect(() =>
      assertTestDatabase(
        "postgres://postgres:postgres@localhost:5432/bookshelf",
      ),
    ).toThrow();
  });

  it("rejects a production connection string", () => {
    expect(() =>
      assertTestDatabase(
        "postgres://u:p@ep-cool.eu-central-1.aws.neon.tech/bookshelf?sslmode=require",
      ),
    ).toThrow();
  });

  it("rejects a string that is not a URL", () => {
    expect(() => assertTestDatabase("not-a-url")).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertTestDatabase("")).toThrow();
  });
});
