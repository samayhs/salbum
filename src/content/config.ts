import { defineCollection, z } from 'astro:content';

const reviews = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    artist: z.string(),
    album: z.string(),
    label: z.string().optional(),
    year: z.number().optional(),
    pubDate: z.coerce.date(),
    tldr: z.tuple([z.string(), z.string(), z.string()]),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { reviews };
