// Lock-in tests for pageIndexBySongId / keyOf. These are the contract that
// search-result navigation depends on (`navigateToSong` looks up a song's
// page index by `keyOf(songId)`). Captured before the perf-overhaul Phase
// 1.5 lazifies pageIndexBySong inside book-store, to ensure the lazified
// version preserves the same observable mapping.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeBookJson } from '../src/decode.js';
import { pageModels } from '../src/page-model.js';
import { pageIndexBySongId, keyOf } from '../src/page-index.js';
import type { Book, PageModel, SongId } from '../src/types.js';

const FIXTURE_DIR = join(__dirname, '..', '__fixtures__');

function readFixtureBook(filename: string): Book {
  return decodeBookJson(readFileSync(join(FIXTURE_DIR, filename), 'utf8'));
}

describe('keyOf', () => {
  it('formats sectionIndex and songIndex with a hyphen', () => {
    expect(keyOf({ sectionIndex: 0, songIndex: 0 })).toBe('0-0');
    expect(keyOf({ sectionIndex: 2, songIndex: 5 })).toBe('2-5');
    expect(keyOf({ sectionIndex: 12, songIndex: 99 })).toBe('12-99');
  });

  it('produces collision-free keys for adjacent positions', () => {
    // Adjacent songIds must have different keys — relied on by the
    // pageIndexBySongId Map. Particularly important when songIndex spans
    // double-digit values that could be ambiguous if the separator were
    // missing.
    const keys = new Set<string>();
    for (let s = 0; s < 5; s++) {
      for (let i = 0; i < 1000; i++) {
        keys.add(keyOf({ sectionIndex: s, songIndex: i }));
      }
    }
    expect(keys.size).toBe(5 * 1000);
  });
});

describe('pageIndexBySongId — round-trip invariants', () => {
  it('returns an empty map for an empty pages list', () => {
    expect(pageIndexBySongId([]).size).toBe(0);
  });

  it('does not index book-cover pages', () => {
    const pages: readonly PageModel[] = [
      { kind: 'book', title: 'X', version: 1 },
    ];
    expect(pageIndexBySongId(pages).size).toBe(0);
  });

  it('does not index section pages', () => {
    const pages: readonly PageModel[] = [
      { kind: 'book', title: 'X', version: 1 },
      { kind: 'section', title: 'A', sectionIndex: 0 },
      { kind: 'section', title: undefined, sectionIndex: 1 },
    ];
    expect(pageIndexBySongId(pages).size).toBe(0);
  });

  it('every entry maps a song-key to a page whose kind is "song"', () => {
    const book = readFixtureBook('maximum.json');
    const pages = pageModels(book);
    const idx = pageIndexBySongId(pages);

    expect(idx.size).toBeGreaterThan(0);
    for (const [, pageIdx] of idx) {
      const page = pages[pageIdx];
      expect(page).toBeDefined();
      expect(page!.kind).toBe('song');
    }
  });

  it('round-trips: keyOf(songId) → pageIdx → page.songId === songId', () => {
    const book = readFixtureBook('maximum.json');
    const pages = pageModels(book);
    const idx = pageIndexBySongId(pages);

    // Walk every song in the book; locate its page via keyOf and assert
    // the recovered songId is byte-equal to the original.
    book.sections.forEach((section, sectionIndex) => {
      section.songs.forEach((_song, songIndex) => {
        const original: SongId = { sectionIndex, songIndex };
        const pageIdx = idx.get(keyOf(original));
        expect(pageIdx).toBeDefined();
        const page = pages[pageIdx!];
        expect(page?.kind).toBe('song');
        if (page?.kind === 'song') {
          expect(page.songId).toEqual(original);
        }
      });
    });
  });

  it('produces one entry per song in the book', () => {
    const book = readFixtureBook('maximum.json');
    const pages = pageModels(book);
    const idx = pageIndexBySongId(pages);

    const expectedCount = book.sections.reduce((n, s) => n + s.songs.length, 0);
    expect(idx.size).toBe(expectedCount);
  });

  it('handles a multi-section book with positional indices that cross section boundaries', () => {
    // Synthetic multi-section book where each section has its own song
    // numbering. The contract: keys are by positional indices, not by
    // any flat ordering — section 0 song 0 and section 1 song 0 must
    // both be present and distinct.
    const book: Book = {
      title: 'B',
      version: 1,
      contactEmail: undefined,
      updateURL: undefined,
      sections: [
        {
          title: 'S0',
          songs: [
            { number: 1, title: 'A', subtitle: undefined, author: undefined, year: undefined, audioFileNames: undefined, relatedSongs: undefined, verses: [] },
            { number: 2, title: 'B', subtitle: undefined, author: undefined, year: undefined, audioFileNames: undefined, relatedSongs: undefined, verses: [] },
          ],
        },
        {
          title: 'S1',
          songs: [
            { number: 1, title: 'C', subtitle: undefined, author: undefined, year: undefined, audioFileNames: undefined, relatedSongs: undefined, verses: [] },
          ],
        },
      ],
    };
    const pages = pageModels(book);
    const idx = pageIndexBySongId(pages);

    expect(idx.size).toBe(3);
    expect(idx.get('0-0')).toBeDefined();
    expect(idx.get('0-1')).toBeDefined();
    expect(idx.get('1-0')).toBeDefined();
    // Distinct entries.
    expect(idx.get('0-0')).not.toBe(idx.get('1-0'));
  });

  it('returned map is a defensive copy — caller cannot tamper with internal state', () => {
    // The function returns a ReadonlyMap, but the underlying object is
    // a Map. Callers casting to Map could mutate it. Lock that the
    // mutation is local to the caller's reference, not shared across
    // calls (each invocation builds a fresh Map).
    const pages: readonly PageModel[] = [
      { kind: 'book', title: 'X', version: 1 },
      { kind: 'section', title: 'A', sectionIndex: 0 },
      {
        kind: 'song',
        songId: { sectionIndex: 0, songIndex: 0 },
        combinedTitle: 'A',
        text: '',
      },
    ];
    const a = pageIndexBySongId(pages) as Map<string, number>;
    const b = pageIndexBySongId(pages);
    a.set('extra', 999);
    expect(b.has('extra')).toBe(false);
  });
});
