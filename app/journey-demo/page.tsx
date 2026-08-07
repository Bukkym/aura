"use client";

import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { BottomBar } from "@/components/aura/screens/bottom-bar";
import { JourneyHome } from "@/components/aura/screens/journey-home";

// Demo route — the journey home in CREW mode (activity 3 of 5) on static data,
// to review the 5-step tracker + bottom bar. Single/empty modes render on the
// live /home. Handlers are omitted (server component); the buttons no-op here.
function noop() {}

export default function JourneyDemoPage() {
  return (
    <PhoneFrame screenKey="journey-demo">
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <JourneyHome
            name="Bukola"
            mode="crew"
            step={3}
            crew={[
              { id: "ada-demo", name: "Ada" },
              { id: "nadia-demo", name: "Nadia" },
              { id: "rina-demo", name: "Rina" },
            ]}
            upNext={{
              title: "Sunday market wander",
              when: "Sun · 11:00 · Kensington",
              recurrence: "Ada and Nadia again, plus one new",
              joined: true,
            }}
          />
        </div>
        <BottomBar active="home" onHome={noop} onAsk={noop} onPlans={noop} />
      </div>
    </PhoneFrame>
  );
}
