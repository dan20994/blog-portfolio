# Blog de ciberseguridad

Blog sobre criptografía, protocolos web y ciberseguridad.

**Sitio:** https://blog-cybersec.vercel.app

## Stack

- [Astro](https://astro.build) + MDX
- Tailwind CSS
- Desplegado en Vercel

## Seguridad

- Content Security Policy basada en hashes, generada por Astro en cada build (`security.csp` en `astro.config.mjs`).
- Cabeceras HTTP de seguridad definidas en `vercel.json`.

## Desarrollo

```sh
pnpm install
pnpm dev       # servidor local en localhost:4321
pnpm build     # build de producción en ./dist/
pnpm preview   # previsualizar el build (necesario para probar la CSP)
```

Los artículos están en `src/content/blog/`.
