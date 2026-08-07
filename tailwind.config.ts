import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Aurora, soft edition. Kept in sync with the CSS tokens in
        // app/globals.css so Tailwind-styled surfaces (auth, widgets) match.
        aura: {
          bg: "#F6F2E9",
          coral: "#DC5B3C", // persimmon (warm secondary)
          lavender: "#B892C9",
          violet: "#7E5C90", // plum — primary accent
          ink: "#201C17", // warm ink
          plum: "#7E5C90",
          persimmon: "#DC5B3C",
          sage: "#53613C",
          teal: "#356059",
        },
        ora: {
          bg: "#0E0B22",
          indigo: "#5B2EFF",
          violet: "#7752E6", // true luminous violet — ring + Ora only
          magenta: "#A24E86",
          light: "#F6F2E9",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: [
          '"Cabinet Grotesk"',
          "var(--font-geist-sans)",
          "system-ui",
          "sans-serif",
        ],
      },
      animation: {
        // Calm 7s breath — slower than a heartbeat, closer to deep breathing.
        // Reads as ambient presence, not surveillance.
        "pulse-slow": "pulse-slow 7s ease-in-out infinite",
        "spin-slow": "spin 10s linear infinite",
        "fade-in": "fade-in 600ms ease-out",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.03)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
