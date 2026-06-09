import { redirect } from "next/navigation";

// Chip onboarding is now the 6-step flow inside the onboarding spine at /.
// This route redirects so old links resolve to the current entry point.
export default function ChipsPage() {
  redirect("/");
}
