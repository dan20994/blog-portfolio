// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog-cybersec.vercel.app',

  adapter: vercel(),

  // CSS como ficheros externos: los <style> inline de componentes no reciben hash CSP
  build: {
    inlineStylesheets: 'never',
  },

  redirects: {
    '/': '/blog/certificados-gratuitos-vs-pago',
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx()],

  // Prism usa clases en vez de estilos inline (Shiki), compatible con la CSP
  markdown: {
    syntaxHighlight: 'prism',
  },

  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },

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