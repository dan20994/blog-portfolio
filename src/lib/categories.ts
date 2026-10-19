export const CATEGORY_IDS = ['tls', 'pki', 'auth', 'postmortem', 'mitos'] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

interface CategoryMeta {
  label: string;
  hue: number;
  // Clases estáticas (no style inline: la CSP lo bloquea). Deben coincidir con hue.
  textClass: string;
  bgClass: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  tls: { label: 'TLS', hue: 230, textClass: 'text-[oklch(78%_0.15_230)]', bgClass: 'bg-[oklch(78%_0.15_230)]' },
  pki: { label: 'PKI', hue: 300, textClass: 'text-[oklch(78%_0.15_300)]', bgClass: 'bg-[oklch(78%_0.15_300)]' },
  auth: {
    label: 'AUTENTICACIÓN',
    hue: 160,
    textClass: 'text-[oklch(78%_0.15_160)]',
    bgClass: 'bg-[oklch(78%_0.15_160)]',
  },
  postmortem: {
    label: 'POST-MORTEM',
    hue: 30,
    textClass: 'text-[oklch(78%_0.15_30)]',
    bgClass: 'bg-[oklch(78%_0.15_30)]',
  },
  mitos: { label: 'MITOS', hue: 55, textClass: 'text-[oklch(78%_0.15_55)]', bgClass: 'bg-[oklch(78%_0.15_55)]' },
};

export const CATEGORY_FILTERS = [
  { id: 'todos' as const, label: '--todos', hue: null },
  ...CATEGORY_IDS.map((id) => ({ id, label: `--${id}`, hue: CATEGORIES[id].hue })),
];
