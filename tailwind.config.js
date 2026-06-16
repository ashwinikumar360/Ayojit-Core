/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "Outfit", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'toast-enter': 'toast-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'toast-enter': {
          '0%': { transform: 'translateX(100%) translateY(0)', opacity: '0' },
          '100%': { transform: 'translateX(0) translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-md': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
