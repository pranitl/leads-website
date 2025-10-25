import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    icon: z.string().optional(),
    summary: z.string(),
    heroTitle: z.string().optional(),
    heroCopy: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    subservices: z
      .array(
        z.object({
          name: z.string(),
          slug: z.string(),
          summary: z.string().optional(),
        }),
      )
      .optional(),
    faqs: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .optional(),
  }),
});

const subservices = defineCollection({
  type: 'data',
  schema: z.object({
    service: z.string(),
    slug: z.string(),
    title: z.string(),
    intro: z.string().optional(),
    avgCost: z.object({ min: z.number(), max: z.number(), notes: z.string().optional() }).optional(),
    highlights: z.array(z.string()).optional(),
    faqs: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .optional(),
  }),
});

const locations = defineCollection({
  type: 'data',
  schema: z.object({
    state: z.string(),
    city: z.string(),
    slug: z.string(),
    intro: z.string().optional(),
    neighborhoods: z.array(z.string()).optional(),
    popularServices: z.array(z.string()).optional(),
  }),
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    publishedAt: z.date(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { services, subservices, locations, posts };
