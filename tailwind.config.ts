import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#f0f9f3",
          100: "#d9f0df",
          300: "#84cc94",
          500: "#27834d",
          600: "#1d6a3e",
          700: "#175534",
          900: "#0b241a",
          950: "#06140f"
        },
        moss: "#a6c75b",
        sunlit: "#f6c76b"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(39, 131, 77, 0.25)",
        panel: "0 30px 90px rgba(0, 0, 0, 0.28)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
