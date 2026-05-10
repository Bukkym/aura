import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          bg: "#FAF7F2",
          coral: "#FF7BAC",
          lavender: "#C97DFF",
          violet: "#7752E6",
          ink: "#1A1530",
        },
        ora: {
          bg: "#0E0B22",
          indigo: "#5B2EFF",
          violet: "#A237FF",
          magenta: "#FF3D9A",
          light: "#FAF7F2",
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
