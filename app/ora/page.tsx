import { redirect } from "next/navigation";

// Parked for the WTP build: the standalone /ora page is off the live path.
// Ora lives inside the product voice, not as its own surface. Code remains in
// the repo (and at tag pre-wtp-full-app).
export default function OraParked() {
  redirect("/");
}
