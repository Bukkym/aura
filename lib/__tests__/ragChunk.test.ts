import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "../ragChunk";

const MD = `# About Aura

## What Aura is

Aura introduces you to compatible people.

## Empty section

## How it works

Ora builds a plan from your preferences.
`;

describe("chunkMarkdown()", () => {
  it("creates one chunk per non-empty H2 section", () => {
    const chunks = chunkMarkdown("about-aura", MD);
    expect(chunks.map((c) => c.heading)).toEqual(["What Aura is", "How it works"]);
  });

  it("drops sections that have a heading but no body", () => {
    const chunks = chunkMarkdown("about-aura", MD);
    expect(chunks.some((c) => c.heading === "Empty section")).toBe(false);
  });

  it("carries the document title and prepends it to each chunk's text", () => {
    const chunks = chunkMarkdown("about-aura", MD);
    expect(chunks[0].title).toBe("About Aura");
    expect(chunks[0].text.startsWith("About Aura: What Aura is")).toBe(true);
    expect(chunks[0].text).toContain("Aura introduces you to compatible people.");
  });

  it("builds stable ids from the source name and index", () => {
    const chunks = chunkMarkdown("about-aura", MD);
    expect(chunks[0].id).toBe("about-aura#0");
    expect(chunks[1].id).toBe("about-aura#2"); // index 1 was the empty section
    expect(chunks.every((c) => c.source === "about-aura")).toBe(true);
  });

  it("returns no chunks for a document with no H2 sections", () => {
    expect(chunkMarkdown("x", "# Title\n\nLoose text with no headings.")).toEqual([]);
  });
});
