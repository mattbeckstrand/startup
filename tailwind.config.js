/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,html}"],
    theme: {
      extend: {
        colors: {
          brand: {
            DEFAULT: 'white',
            light: 'rgb(48, 46, 46)',
            dark: 'rgb(24, 23, 23)',
        
      },
    },
  },
},
    plugins: [],
  }
  