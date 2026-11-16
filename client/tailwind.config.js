/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  important: true,
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      keyframes: {
        "dialog-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "none" },
          to: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "alert-in": {
          from: { opacity: "0", transform: "translateY(-8px)", "grid-template-rows": "0fr" },
          to: { opacity: "1", transform: "none", "grid-template-rows": "1fr" },
        },
        "alert-out": {
          from: { opacity: "1", transform: "none", "grid-template-rows": "1fr" },
          to: { opacity: "0", transform: "translateY(-8px)", "grid-template-rows": "0fr" },
        },
      },
      animation: {
        "dialog-in": "dialog-in 200ms ease-out",
        "dialog-out": "dialog-out 150ms ease-in forwards",
        "fade-in": "fade-in 200ms ease-out",
        "fade-out": "fade-out 150ms ease-in forwards",
        "alert-in": "alert-in 200ms ease-out",
        "alert-out": "alert-out 150ms ease-in forwards",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
