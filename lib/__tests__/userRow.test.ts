import { describe, it, expect } from "vitest";
import { deriveDisplayNameFromEmail, parseVector } from "../userRow";

describe("deriveDisplayNameFromEmail()", () => {
  it("capitalizes the local part of the email", () => {
    expect(deriveDisplayNameFromEmail("alice@example.com")).toBe("Alice");
  });

  it("keeps the rest of the local part untouched, including dots", () => {
    expect(deriveDisplayNameFromEmail("alice.smith@example.com")).toBe(
      "Alice.smith",
    );
  });

  it("falls back to Friend when the email is undefined", () => {
    expect(deriveDisplayNameFromEmail(undefined)).toBe("Friend");
  });

  it("falls back to Friend when the email has an empty local part", () => {
    expect(deriveDisplayNameFromEmail("@example.com")).toBe("Friend");
  });

  it("handles an already-capitalized local part without changing it", () => {
    expect(deriveDisplayNameFromEmail("Bob@example.com")).toBe("Bob");
  });
});

describe("parseVector()", () => {
  it("returns an empty array for null or undefined", () => {
    expect(parseVector(null)).toEqual([]);
    expect(parseVector(undefined)).toEqual([]);
  });

  it("returns an array input unchanged", () => {
    expect(parseVector([0.1, 0.2])).toEqual([0.1, 0.2]);
  });

  it("parses the bracketed pgvector text form into numbers", () => {
    expect(parseVector("[0.1, 0.2, 0.3]")).toEqual([0.1, 0.2, 0.3]);
  });
});
