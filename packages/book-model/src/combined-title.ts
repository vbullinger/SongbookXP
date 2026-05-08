import type { Song } from './types.js';

/**
 * The song's display title. Mirrors Swift-Rewrite's `Song.combinedTitle`:
 * - number + title         → "{number}: {title}"
 * - number only            → "{number}: Untitled Song"
 * - title only             → "{title}"
 * - neither                → "Untitled Song"
 */
export function combinedTitle(song: Pick<Song, 'number' | 'title'>): string {
  const prefix = song.number !== undefined ? `${song.number}: ` : '';
  const body = song.title ?? 'Untitled Song';
  return prefix + body;
}
