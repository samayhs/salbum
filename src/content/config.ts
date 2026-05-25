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
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const lists = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    kicker: z.string().optional(),
    pubDate: z.coerce.date(),
    color: z.enum(['forest', 'umber', 'indigo']).default('forest'),
    entries: z.array(
      z.object({
        track: z.string(),
        artist: z.string(),
        note: z.string().optional(),
      })
    ),
  }),
});

export const collections = { reviews, lists };
