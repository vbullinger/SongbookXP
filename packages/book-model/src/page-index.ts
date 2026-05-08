import type { PageModel, SongId } from './types.js';

/**
 * Build a lookup from `{sectionIndex}-{songIndex}` to the position of that
 * song's page in the flattened pager sequence. Used by search-result
 * navigation to jump the pager directly to a matched song.
 */
export function pageIndexBySongId(pages: readonly PageModel[]): ReadonlyMap<string, number> {
  const m = new Map<string, number>();
  pages.forEach((page, index) => {
    if (page.kind === 'song') {
      m.set(keyOf(page.songId), index);
    }
  });
  return m;
}

export function keyOf(songId: SongId): string {
  return `${songId.sectionIndex}-${songId.songIndex}`;
}
