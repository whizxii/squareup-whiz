import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
      colors: {
        cream: "#f5f2ed",
        "cream-dark": "#eae5dd",
        lime: "#FF5A36",
        "lime-bright": "#F73B20",
        "maze-black": "#212121",
        "maze-gray": "#757575",
        "maze-blue": "#4a90d9",
        "maze-purple": "#9c6ade",
        "maze-orange": "#e8a838",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      animation: {
        "scroll-left": "scroll-left 30s linear infinite",
        "scroll-left-slow": "scroll-left 45s linear infinite",
        "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
        "float-1": "float-1 6s ease-in-out infinite",
        "float-2": "float-2 7s ease-in-out infinite",
        "float-3": "float-3 5s ease-in-out infinite",
      },
      keyframes: {
        "scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(-5%)" },
          "50%": { transform: "translateY(0)" },
        },
        "float-1": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "33%": { transform: "translate(10px, -15px) rotate(2deg)" },
          "66%": { transform: "translate(-5px, 10px) rotate(-1deg)" },
        },
        "float-2": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "33%": { transform: "translate(-12px, 8px) rotate(-2deg)" },
          "66%": { transform: "translate(8px, -12px) rotate(1deg)" },
        },
        "float-3": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "33%": { transform: "translate(8px, 12px) rotate(1deg)" },
          "66%": { transform: "translate(-10px, -8px) rotate(-2deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
