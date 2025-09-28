/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 35px rgba(0,0,0,.25)",
      },
      backgroundImage: {
        'radial': 'radial-gradient(1000px 600px at top left, rgba(99,102,241,0.15), transparent)'
      }
    },
  },
  plugins: [],
}
