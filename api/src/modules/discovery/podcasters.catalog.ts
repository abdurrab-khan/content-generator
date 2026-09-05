import { PodcastLanguage } from '../../generated/prisma/client.js';

/**
 * Curated podcaster catalog — one list per application language. Discovery
 * searches YouTube once per podcaster (`query`) and ranks the results, so
 * keep queries specific enough to surface the podcaster's own channel
 * (including the show name works well).
 *
 * Extension point: add a language to `PodcastLanguage` in the Prisma schema
 * and a matching list here — nothing else changes.
 */
export interface PodcasterEntry {
  /** Display name shown in the UI. */
  name: string;
  /** YouTube search query that surfaces this podcaster's episodes. */
  query: string;
}

export const PODCASTERS_BY_LANGUAGE: Record<PodcastLanguage, PodcasterEntry[]> =
  {
    [PodcastLanguage.ENGLISH]: [
      { name: 'Joe Rogan', query: 'The Joe Rogan Experience podcast' },
      { name: 'Steven Bartlett', query: 'The Diary Of A CEO podcast' },
      { name: 'Lex Fridman', query: 'Lex Fridman podcast' },
      { name: 'Tim Ferriss', query: 'The Tim Ferriss Show podcast' },
      { name: 'Andrew Huberman', query: 'Huberman Lab podcast' },
      { name: 'My First Million', query: 'My First Million podcast' },
      { name: 'Chris Williamson', query: 'Modern Wisdom podcast' },
      { name: 'Theo Von', query: 'This Past Weekend Theo Von podcast' },
    ],
    [PodcastLanguage.HINDI]: [
      { name: 'Raj Shamani', query: 'Raj Shamani Figuring Out podcast hindi' },
      { name: 'Nikhil Kamath', query: 'Nikhil Kamath WTF podcast hindi' },
      { name: 'Prakhar Gupta', query: 'Prakhar Gupta podcast hindi' },
      {
        name: 'Ranveer Allahbadia',
        query: 'Ranveer Allahbadia TRS podcast hindi',
      },
      { name: 'Abhijit Chavda', query: 'Abhijit Chavda podcast hindi' },
      { name: 'Aakash Gupta', query: 'Aakash Gupta podcast hindi' },
    ],
  };

/** Catalog list for a language (empty-safe for languages added later). */
export function podcastersForLanguage(
  language: PodcastLanguage,
): PodcasterEntry[] {
  return PODCASTERS_BY_LANGUAGE[language] ?? [];
}
