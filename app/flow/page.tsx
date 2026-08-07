import { redirect } from "next/navigation";

// Parked for the WTP build: the sample-data /flow showcase is off the live path.
// Component code remains in the repo (and at tag pre-wtp-full-app); this route
// redirects so nothing off-direction lingers.
export default function FlowParked() {
  redirect("/");
}
