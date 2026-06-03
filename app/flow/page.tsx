import { AuraFlow } from "@/components/aura/AuraFlow";

// The full aura product flow recreated from design_handoff_aura: welcome → entry
// → voice → follow-up → preferences → finding → home → plan → accepted → plans →
// the stretch moment. Pixel-faithful to the prototype; wiring each screen to the
// live auth + deterministic matching layer (Slices 1 + 3) is the follow-up.
export default function FlowPage() {
  return <AuraFlow />;
}
