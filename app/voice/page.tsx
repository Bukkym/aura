import { redirect } from "next/navigation";

// The voice screen is now an in-flow step of the onboarding spine at /. This
// route is kept as a redirect so old links (and the magic-link bounce) land in
// the right place.
export default function VoicePage() {
  redirect("/");
}
