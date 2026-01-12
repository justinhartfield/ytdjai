import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // YTDJ.AI Design System Colors
        background: {
          deep: '#05060f',
          carbon: '#0a0c1c',
          panel: 'rgba(15, 17, 35, 0.7)',
        },
        accent: {
          cyan: '#00f2ff',
          magenta: '#ff00e5',
          orange: '#ff5500',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.05)',
          active: 'rgba(0, 242, 255, 0.5)',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 10s linear infinite',
        'float': 'float 20s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 242, 255, 0.7)' },
          '70%': { boxShadow: '0 0 0 15px rgba(0, 242, 255, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 242, 255, 0)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'float': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(30px, -50px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 242, 255, 0.6)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
