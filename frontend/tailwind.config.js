/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A1A1A",   // Charcoal
        accent: "#C7A760",    // Gold
        offwhite: "#F7F5EE",  // Warm background
        panel: "#FAFAF8",     // Card background
        slate: "#6E717A",     // Subtle text
      },
    },
  },
  plugins: [],
}
