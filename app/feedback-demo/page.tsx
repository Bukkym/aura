import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { FeedbackView } from "@/components/aura/screens/feedback";

// Demo route — the post-plan feedback screen on static data, to review the
// visual design without needing a completed plan.
export default function FeedbackDemoPage() {
  return (
    <PhoneFrame screenKey="feedback-demo">
      <FeedbackView
        planLabel="Saturday · Grindhaus"
        people={[
          { id: "ada-demo", name: "Ada" },
          { id: "nadia-demo", name: "Nadia" },
          { id: "theo-demo", name: "Theo" },
        ]}
      />
    </PhoneFrame>
  );
}
