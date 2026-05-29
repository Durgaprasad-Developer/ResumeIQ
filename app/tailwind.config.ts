import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        sans: ["DM Sans", "sans-serif"],
      },
      colors: {
        accent: "#c8f53c",
        "accent-dark": "#9dc92b",
        "rs-black": "#0a0a0a",
        "rs-white": "#fafaf8",
        "rs-cream": "#f5f3ee",
        "rs-muted": "#6b6b65",
      },
      animation: {
        "spin-slow": "spin 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
