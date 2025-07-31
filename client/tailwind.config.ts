import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}', 
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'pixel': ['font-04b', 'monospace'],
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        'light-green': 'hsl(var(--light-green))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))', 
          light: 'hsl(var(--primary-light))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)', 
        md: 'calc(var(--radius) - 2px)', 
        sm: 'calc(var(--radius) - 4px)', 
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'move-1': {
          '0%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' },
          '33%': { transform: 'translate(40%, 20%) rotate(var(--tw-rotate, 0))' },
          '66%': { transform: 'translate(-20%, 40%) rotate(var(--tw-rotate, 0))' },
          '100%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' }
        },
        'move-2': {
          '0%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' },
          '33%': { transform: 'translate(-30%, -20%) rotate(var(--tw-rotate, 0))' },
          '66%': { transform: 'translate(20%, 30%) rotate(var(--tw-rotate, 0))' },
          '100%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' }
        },
        'move-3': {
          '0%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' },
          '33%': { transform: 'translate(30%, -30%) rotate(var(--tw-rotate, 0))' },
          '66%': { transform: 'translate(-40%, 10%) rotate(var(--tw-rotate, 0))' },
          '100%': { transform: 'translate(0, 0) rotate(var(--tw-rotate, 0))' }
        },
        gradient: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'move-1': 'move-1 20s ease-in-out infinite',
        'move-2': 'move-2 20s ease-in-out infinite',
        'move-3': 'move-3 20s ease-in-out infinite',
        'gradient': 'gradient 8s linear infinite'
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
