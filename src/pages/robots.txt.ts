const FALLBACK_SITE = 'https://austinrenohub.com';

export function GET({ site }: { site: URL | undefined }) {
  const origin = site?.origin ?? FALLBACK_SITE;
  const sitemapUrl = new URL('/sitemap.xml', origin).toString();
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /api/',
    'Disallow: /_astro/',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
