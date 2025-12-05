import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

type UrlEntry = {
  loc: string;
  priority: string;
  changefreq?: string;
  lastmod?: string;
};

const addUrl = (
  urls: UrlEntry[],
  base: URL,
  path: string,
  priority: number,
  changefreq?: string,
  lastmod?: string,
) => {
  const url = new URL(path, base);
  urls.push({
    loc: url.toString(),
    priority: priority.toFixed(1),
    changefreq,
    lastmod,
  });
};

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://austinhomereno.com');
  const urls: UrlEntry[] = [];

  const today = new Date().toISOString();

  // Core static pages
  addUrl(urls, base, '/', 1.0, 'weekly', today);
  addUrl(urls, base, '/services', 0.8, 'weekly', today);
  addUrl(urls, base, '/locations', 0.8, 'weekly', today);
  addUrl(urls, base, '/about', 0.8, 'monthly', today);
  addUrl(urls, base, '/contact', 0.8, 'monthly', today);
  addUrl(urls, base, '/blog', 0.6, 'weekly', today);
  addUrl(urls, base, '/privacy', 0.3, 'yearly', today);
  addUrl(urls, base, '/terms', 0.3, 'yearly', today);

  // Services and subservices
  const services = await getCollection('services');
  for (const service of services) {
    addUrl(urls, base, `/services/${service.data.slug}`, 0.8, 'monthly', today);
  }

  const subservices = await getCollection('subservices');
  for (const sub of subservices) {
    addUrl(urls, base, `/services/${sub.data.service}/${sub.data.slug}`, 0.7, 'monthly', today);
  }

  // Locations
  const locations = await getCollection('locations');
  for (const location of locations) {
    addUrl(urls, base, `/locations/${location.data.slug}`, 0.7, 'monthly', today);
  }

  // Blog posts
  const posts = await getCollection('posts');
  for (const post of posts) {
    const lastmod = post.data.publishedAt.toISOString();
    addUrl(urls, base, `/blog/${post.slug}`, 0.7, 'monthly', lastmod);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((entry) => {
    return [
      '  <url>',
      `    <loc>${entry.loc}</loc>`,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : '',
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : '',
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};

