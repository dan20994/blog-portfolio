// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://protocolo-roto.example',

  adapter: vercel(),

  redirects: {
    '/': '/blog/certificados-gratuitos-vs-pago',
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx()],

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      weights: [400, 500, 600],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400, 500, 600, 700],
    },
  ],
});