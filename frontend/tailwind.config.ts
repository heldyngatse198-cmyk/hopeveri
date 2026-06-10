import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#090b17',
        accent: {
          50: '#e8f3ff',
          100: '#d4e8ff',
          200: '#accfff',
          300: '#7db7ff',
          400: '#569cff',
          500: '#3d83ff',
          600: '#2f66e6',
          700: '#294fba',
          800: '#243f91',
          900: '#1f2f6c'
        }
      },
      boxShadow: {
        soft: '0 30px 80px rgba(4, 17, 45, 0.3)',
      },
      borderRadius: {
        '2xl': '20px',
      }
    },
  },
  plugins: [],
};

export default config;
