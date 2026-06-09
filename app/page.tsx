import { OnboardingFlow } from "@/components/aura/OnboardingFlow";

// The aura entry point: the onboarding spine (welcome → entry → voice → chips),
// recreated from design_handoff_aura and wired to the deterministic pipeline.
// On the final chip submit it writes the aura:draft profile and routes to /plan.
export default function HomePage() {
  return <OnboardingFlow />;
}
