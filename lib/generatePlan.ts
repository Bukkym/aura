import type { Plan, User, Place } from "@/types";

// Stub for the Plan generation pipeline. See /technical/02-data-model.md
// for the full spec (pick activity → pick venue → pick time → pick attendees → why-this-plan).

export async function generatePlan(
  _host: User,
  _pool: User[],
  _places: Place[]
): Promise<Plan> {
  throw new Error(
    "generatePlan is not implemented yet — wire up after embedding + matching pipeline lands."
  );
}
