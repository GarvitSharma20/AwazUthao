/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1D9E75",
        "primary-dark": "#085041",
        critical: "#EF4444",
        high: "#F97316",
        medium: "#EAB308",
        resolved: "#22C55E",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "bounce-pin": "bounce-pin 1s ease-in-out infinite alternate",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "bounce-pin": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-8px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", "box-shadow": "0 0 0 0 rgba(29, 158, 117, 0.5)" },
          "70%": { transform: "scale(1)", "box-shadow": "0 0 0 10px rgba(29, 158, 117, 0)" },
          "100%": { transform: "scale(0.95)", "box-shadow": "0 0 0 0 rgba(29, 158, 117, 0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
