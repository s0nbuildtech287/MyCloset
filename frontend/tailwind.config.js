/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF6F1", // Kem/be ấm
        text: "#2A2521",       // Đen ấm
        accent: {
          terracotta: "#C4704F",
          sage: "#8A9A5B"
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"]
      }
    },
  },
  plugins: [],
}
