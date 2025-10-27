import type { CollectionEntry } from 'astro:content';

export type LocationEntry = CollectionEntry<'locations'>;

export const LOCATION_PRIORITY: string[] = [
  'texas/austin',
  'texas/cedar-park',
  'texas/round-rock',
  'texas/georgetown',
  'texas/leander',
  'texas/dripping-springs',
  'texas/bee-caves',
];

const priorityIndex = new Map(LOCATION_PRIORITY.map((slug, index) => [slug, index]));

export const orderLocationsByPriority = (entries: LocationEntry[]): LocationEntry[] =>
  [...entries].sort((a, b) => {
    const aIndex = priorityIndex.has(a.data.slug) ? priorityIndex.get(a.data.slug)! : LOCATION_PRIORITY.length;
    const bIndex = priorityIndex.has(b.data.slug) ? priorityIndex.get(b.data.slug)! : LOCATION_PRIORITY.length;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.data.city.localeCompare(b.data.city);
  });
