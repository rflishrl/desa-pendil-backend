import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// Admin theme: same brand tokens as the public site (primary #F0A400, ink #221C1C)
// with Fira Sans, the data/admin-panel pairing suggested by ui-ux-pro-max.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FFF9EC",
          100: "#FDF1D9",
          DEFAULT: "#F0A400",
          500: "#F0A400",
          600: "#D18F00",
          700: "#8F5F00",
        },
        ink: "#221C1C",
        muted: "#5F5F5F",
        canvas: "#F6F6F4",
        line: "#E3E1DC",
        danger: { DEFAULT: "#B42318", 50: "#FEF3F2" },
        success: { DEFAULT: "#1B7A43", 50: "#EAF7EF" },
      },
      fontFamily: {
        sans: ["var(--font-fira-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-fira-code)", ...defaultTheme.fontFamily.mono],
      },
      boxShadow: { card: "0 1px 2px rgba(0,0,0,.04), 0 2px 12px rgba(0,0,0,.04)" },
    },
  },
  plugins: [],
};

export default config;
