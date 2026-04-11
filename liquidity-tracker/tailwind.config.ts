import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["IBM Plex Mono", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        terminal: {
          bg: "#0a0f0a",
          surface: "#0d1a0d",
          border: "#1a3a1a",
          green: "#00ff41",
          "green-dim": "#00cc33",
          "green-muted": "#006618",
          amber: "#ffb300",
          red: "#ff3333",
          text: "#c8ffc8",
          "text-dim": "#7ab87a",
          "text-muted": "#3d6b3d",
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
