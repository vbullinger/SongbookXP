import { describe, expect, it } from 'vitest';
import { pageModels } from '../src/page-model.js';
import type { Book } from '../src/types.js';

const book: Book = {
  title: 'X',
  version: 3,
  contactEmail: undefined,
  updateURL: undefined,
  sections: [
    {
      title: 'S0',
      songs: [
        { number: 1, title: 'Song A', subtitle: undefined, author: undefined, year: undefined, audioFileNames: undefined, relatedSongs: undefined, verses: [] },
      ],
    },
    {
      title: undefined,
      songs: [
        { number: undefined, title: undefined, subtitle: undefined, author: undefined, year: undefined, audioFileNames: undefined, relatedSongs: undefined, verses: [] },
      ],
    },
  ],
};

describe('pageModels', () => {
  const pages = pageModels(book);

  it('emits book cover as the first page', () => {
    expect(pages[0]).toEqual({ kind: 'book', title: 'X', version: 3 });
  });

  it('interleaves sections and songs in positional order', () => {
    expect(pages.map((p) => p.kind)).toEqual(['book', 'section', 'song', 'section', 'song']);
  });

  it('tags song pages with a positional SongId', () => {
    const firstSong = pages.find((p) => p.kind === 'song');
    expect(firstSong?.kind === 'song' && firstSong.songId).toEqual({ sectionIndex: 0, songIndex: 0 });
  });

  it('computes combinedTitle for each song page', () => {
    const songPages = pages.filter((p) => p.kind === 'song');
    expect(songPages[0]!.kind === 'song' && songPages[0]!.combinedTitle).toBe('1: Song A');
    expect(songPages[1]!.kind === 'song' && songPages[1]!.combinedTitle).toBe('Untitled Song');
  });
});
