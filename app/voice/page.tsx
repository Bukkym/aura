import { redirect } from "next/navigation";

// Parked for the WTP build: voice onboarding is off the live path (welcome goes
// straight to the chip capture). The voice screens/components remain in the repo
// (and at tag pre-wtp-full-app) and can be re-linked when voice is un-parked.
export default function VoiceParked() {
  redirect("/start");
}
