import { redirect } from "next/navigation";

// The old standalone /chips route is superseded by the onboarding flow at /start.
export default function ChipsParked() {
  redirect("/start");
}
