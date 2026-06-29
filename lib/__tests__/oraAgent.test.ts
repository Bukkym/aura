import { describe, it, expect } from "vitest";
import { buildOraSystem } from "../oraAgent";

describe("buildOraSystem()", () => {
  it("includes the Ora persona and the refinement guidance", () => {
    const sys = buildOraSystem("");
    expect(sys).toContain("You are Ora");
    expect(sys).toContain("refine_plan");
    expect(sys.toLowerCase()).toContain("confirm");
  });

  it("embeds the retrieved knowledge context when provided", () => {
    const sys = buildOraSystem("Aura matches you by weighted overlap.");
    expect(sys).toContain("Knowledge context:");
    expect(sys).toContain("Aura matches you by weighted overlap.");
  });

  it("notes when no knowledge was retrieved", () => {
    expect(buildOraSystem("   ")).toContain("(none retrieved");
  });
});
