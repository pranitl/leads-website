// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import critters from 'astro-critters';

export default defineConfig({
  site: 'https://austinhomereno.com',
  integrations: [
    preact(),
    tailwind({
      applyBaseStyles: false,
    }),
    critters({
      preload: 'media',
      pruneSource: true,
    }),
  ],
  experimental: {
    contentIntellisense: true,
  },
});
