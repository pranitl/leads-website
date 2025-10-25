import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,tsx,md,mdx}', './public/**/*.html'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F0F7F6',
          100: '#D6E7E4',
          200: '#AFD0CB',
          300: '#7FB8B1',
          400: '#4EA497',
          500: '#2F8A7E',
          600: '#1C5D56',
          700: '#14463F',
          800: '#0D2F2A',
          900: '#071B18',
          DEFAULT: '#1C5D56',
        },
        accent: {
          gold: '#F5A524',
          blue: '#2F7EF6',
        },
        neutral: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          400: '#94A3B8',
          200: '#E5E7EB',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        success: '#16A34A',
        warning: '#EAB308',
        danger: '#DC2626',
      },
      boxShadow: {
        card: '0 20px 45px -25px rgba(15, 23, 42, 0.35)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [forms(), typography()],
};
