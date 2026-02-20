/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,js,jsx,ts,tsx}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        clay: {
          mint: '#4DC8A8',
          'mint-light': '#A0DDD0',
          'mint-pale': '#D8F2EC',
          peach: '#F5A88C',
          'peach-light': '#FACCC0',
          'peach-pale': '#FDEEE8',
          blue: '#72B8E0',
          'blue-light': '#B4D8F0',
          'blue-pale': '#DEEEFA',
          lavender: '#B8A8D8',
          'lavender-light': '#D8D0F0',
          yellow: '#F0C870',
          'yellow-light': '#FAE4B0',
          bg: '#F7F3EE',
          card: '#FFFCF8',
          dark: '#2D3A34',
          text: '#3D4A44',
          muted: '#7A8C84',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        clay: '8px 8px 24px rgba(0,0,0,0.09), -4px -4px 14px rgba(255,255,255,0.92)',
        'clay-sm': '4px 4px 14px rgba(0,0,0,0.07), -3px -3px 10px rgba(255,255,255,0.9)',
        'clay-lg': '12px 12px 32px rgba(0,0,0,0.11), -6px -6px 18px rgba(255,255,255,0.88)',
        'clay-mint': '8px 8px 24px rgba(77,200,168,0.38), -4px -4px 12px rgba(255,255,255,0.55)',
        'clay-peach': '8px 8px 24px rgba(245,168,140,0.38), -4px -4px 12px rgba(255,255,255,0.55)',
        'clay-blue': '8px 8px 24px rgba(114,184,224,0.38), -4px -4px 12px rgba(255,255,255,0.55)',
        'clay-lavender': '8px 8px 24px rgba(184,168,216,0.38), -4px -4px 12px rgba(255,255,255,0.55)',
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
