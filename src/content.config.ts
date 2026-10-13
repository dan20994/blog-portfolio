import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_IDS } from './lib/categories';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.enum(CATEGORY_IDS),
    date: z.coerce.date(),
    readTime: z.number(),
    featured: z.boolean().default(false),
    author: z.string().default('Daniel Hernández'),
    image: z.string().startsWith('/').optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { blog };
