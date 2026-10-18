/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#14181F',
        panel: '#1D232D',
        border: '#2B3340',
        text: '#E8E6DF',
        muted: '#98A0AE',
        accent: {
          DEFAULT: '#E8962E',
          hover: '#cf8122',
        },
        status: {
          green: '#2FA866',
          yellow: '#E5B91F',
          red: '#D93C3C',
          grey: '#7A8190',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        control: '6px',
        panel: '10px',
      },
    },
  },
  plugins: [],
}
