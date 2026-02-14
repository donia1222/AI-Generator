import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        begonia: {
          400: "#fe6c75",
          500: "#e1545d",
          600: "#f06069",
        },
        gunpowder: {
          50: "#f4f7fb",
          100: "#dfeefb",
          150: "#c8d5e3",
          200: "#a8b8cc",
          300: "#8a9bb3",
          400: "#6b7d99",
          500: "#728198",
          600: "#3f4960",
          700: "#424e65",
          800: "#2a3347",
          900: "#0f1d2c",
        },
        cerulean: {
          25: "#f0f8fd",
          50: "#e0f1fa",
          100: "#b3ddf2",
          400: "#15a0da",
          500: "#0089c2",
        },
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
