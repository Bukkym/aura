import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { JourneyHome } from "@/components/aura/screens/journey-home";

// Demo route — the journey home (filling-ring "your circle is forming") on
// static data, to review the visual design without auth/live data.
export default function JourneyDemoPage() {
  return (
    <PhoneFrame screenKey="journey-demo">
      <JourneyHome
        name="Bukola"
        circle={[
          { id: "ada-demo", name: "Ada" },
          { id: "nadia-demo", name: "Nadia" },
          { id: "rina-demo", name: "Rina" },
        ]}
        upNext={{ title: "Sunday market wander", when: "Sun · 11:00 · Kensington", joined: true }}
      />
    </PhoneFrame>
  );
}
