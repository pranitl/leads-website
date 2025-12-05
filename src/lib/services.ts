import type { CollectionEntry } from 'astro:content';
import type { ServiceOption } from './leadFormTypes';

export type ServiceEntry = CollectionEntry<'services'>;

export const toLeadFormServiceOptions = (entries: ServiceEntry[]): ServiceOption[] =>
  entries.map((entry) => ({
    slug: entry.data.slug,
    name: entry.data.name,
    subservices: entry.data.subservices ?? [],
  }));
