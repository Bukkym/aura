// Procedural aurora gradient per user, derived from a seed (the user's id).
// Stands in for a profile photo while honoring the "no browsing profiles"
// rule from the product vision — you see their energy, not their face.
//
// The seed is hashed to a starting angle and three palette picks from the
// aurora palette, then composed into a conic-gradient. Same seed → same
// swatch; different seeds → visually distinct.

const PALETTE = [
  "#FF7BAC", // aura coral
  "#C97DFF", // aura lavender
  "#7752E6", // aura violet
  "#5B2EFF", // ora indigo
  "#A237FF", // ora violet
  "#FF3D9A", // ora magenta
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function AuraSwatch({
  seed,
  size = 32,
}: {
  seed: string;
  size?: number;
}) {
  const h = hash(seed);
  const angle = h % 360;
  const a = PALETTE[h % PALETTE.length];
  const b = PALETTE[(h * 7 + 3) % PALETTE.length];
  const c = PALETTE[(h * 13 + 7) % PALETTE.length];

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(from ${angle}deg, ${a}, ${b}, ${c}, ${a})`,
        flexShrink: 0,
      }}
    />
  );
}
