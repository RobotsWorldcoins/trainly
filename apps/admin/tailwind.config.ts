import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        trainly: {
          blue: '#1B6FEB',
          dark: '#1B2A4A',
          accent: '#F5A623',
        },
      },
    },
  },
  plugins: [],
};

export default config;
