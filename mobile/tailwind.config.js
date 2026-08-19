/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#08080E',
        surface: '#0F0F17',
        card: '#14141E',
        cardalt: '#1A1A26',
        edge: 'rgba(255,255,255,0.07)',
        primary: '#8B5CF6',
        primarybright: '#A78BFA',
        accent: '#E879F9',
        muted: '#A3A3B2',
        dim: '#5F6170',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#60A5FA',
      },
    },
  },
  plugins: [],
};
