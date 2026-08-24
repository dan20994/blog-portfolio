export const CATEGORY_IDS = ['tls', 'pki', 'postmortem', 'mitos'] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

interface CategoryMeta {
  label: string;
  hue: number;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  tls: { label: 'TLS', hue: 230 },
  pki: { label: 'PKI', hue: 300 },
  postmortem: { label: 'POST-MORTEM', hue: 30 },
  mitos: { label: 'MITOS', hue: 55 },
};

export const CATEGORY_FILTERS = [
  { id: 'todos' as const, label: '--todos', hue: null },
  ...CATEGORY_IDS.map((id) => ({ id, label: `--${id}`, hue: CATEGORIES[id].hue })),
];
