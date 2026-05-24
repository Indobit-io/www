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
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        cmc: {
          bg: "#0d1117",
          surface: "#161b22",
          "surface-2": "#1c2230",
          border: "#21262d",
          blue: "#3861fb",
          "blue-dim": "#2a4fd6",
          green: "#16c784",
          "green-dim": "#0da86e",
          red: "#ea3943",
          yellow: "#f0b90b",
          text: "#eff2f5",
          "text-secondary": "#a1a7bb",
          "text-muted": "#5c6370",
        },
      },
    },
  },
  plugins: [],
};

export default config;
