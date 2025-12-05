// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://austinhomereno.com',
  integrations: [
    preact(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  experimental: {
    contentIntellisense: true,
  },
});
