/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d7ebff',
          500: '#1d78ff',
          600: '#165fe0',
          700: '#144cbc'
        },
        accent: {
          500: '#12b981',
          600: '#059669'
        },
        surface: '#f4f7fb',
        ink: '#0f172a'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15, 23, 42, 0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at top right, rgba(29,120,255,0.16), transparent 32%), radial-gradient(circle at bottom left, rgba(18,185,129,0.18), transparent 28%)'
      }
    }
  },
  plugins: []
};
