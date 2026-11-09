export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#f2faf0',
          100: '#e0f3db',
          200: '#c1e6b9',
          300: '#93d287',
          400: '#5fb852',
          500: '#3d9c33',
          600: '#2d7e27',
          700: '#256422',
          800: '#215021',
          900: '#1c431d',
        },
        tang: {
          50: '#fff6ed',
          100: '#ffead4',
          400: '#ff9a3d',
          500: '#fb7c14',
          600: '#ec600a',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
