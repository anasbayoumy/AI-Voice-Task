/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gemini Live color palette
        'gemini-blue': '#4285F4',
        'gemini-red': '#EA4335',
        'gemini-cyan': '#AECBFA',
        'gemini-bg': '#131314',
        'gemini-surface': '#1E1E1E',
      },
      animation: {
        'breathing': 'breathing 4s ease-in-out infinite',
        'pulse-fast': 'pulse 0.8s ease-in-out infinite',
        'morph': 'morph 2s ease-in-out infinite',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        morph: {
          '0%, 100%': { 
            transform: 'scale(1) rotate(0deg)',
            borderRadius: '50%',
          },
          '33%': { 
            transform: 'scale(1.2) rotate(120deg)',
            borderRadius: '40%',
          },
          '66%': { 
            transform: 'scale(0.9) rotate(240deg)',
            borderRadius: '60%',
          },
        },
      },
    },
  },
  plugins: [],
}
