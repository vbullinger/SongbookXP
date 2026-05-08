import { describe, expect, it } from 'vitest';
import { search } from '../src/search.js';
import type { Book, Song, Verse } from '../src/types.js';

const verse = (over: Partial<Verse> = {}): Verse => ({
  title: undefined,
  number: undefined,
  text: undefined,
  isChorusInt: undefined,
  isChorus: false,
  chorusIndex: undefined,
  repeatText: undefined,
  ...over,
});

const song = (over: Partial<Song> = {}): Song => ({
  number: undefined,
  title: undefined,
  subtitle: undefined,
  author: undefined,
  year: undefined,
  audioFileNames: undefined,
  relatedSongs: undefined,
  verses: [],
  ...over,
});

const book = (
  ...sections: { title?: string; songs: Song[] }[]
): Book => ({
  title: 'b',
  version: 1,
  contactEmail: undefined,
  updateURL: undefined,
  sections: sections.map((s) => ({ title: s.title, songs: s.songs })),
});

describe('search', () => {
  it('returns [] for empty queries', () => {
    const b = book({ songs: [song({ title: 'Foo' })] });
    expect(search(b, '')).toEqual([]);
    expect(search(b, '   ')).toEqual([]);
  });

  it('matches a song title case-insensitively', () => {
    const b = book({ title: 'S', songs: [song({ title: 'Foo Bar' })] });
    const r = search(b, 'foo');
    expect(r).toHaveLength(1);
    expect(r[0]!.results).toHaveLength(1);
    expect(r[0]!.results[0]!.matchType).toBe('title-prefix');
  });

  it('ranks exact title match above prefix match', () => {
    const b = book({
      songs: [song({ title: 'Foo Bar' }), song({ title: 'Foo' })],
    });
    const r = search(b, 'foo');
    const results = r[0]!.results;
    expect(results[0]!.matchType).toBe('exact-title');
    expect(results[0]!.combinedTitle).toBe('Foo');
    expect(results[1]!.matchType).toBe('title-prefix');
  });

  it('falls back to text match with a snippet', () => {
    const b = book({
      songs: [
        song({
          title: 'Unrelated',
          verses: [verse({ text: 'The quick brown fox jumps over the lazy dog.' })],
        }),
      ],
    });
    const r = search(b, 'brown');
    expect(r).toHaveLength(1);
    const result = r[0]!.results[0]!;
    expect(result.matchType).toBe('text');
    expect(result.snippet).toContain('brown');
  });

  it('returns one result per song even when multiple fields match', () => {
    const b = book({
      songs: [
        song({
          title: 'Beacon',
          subtitle: 'Beacon of hope',
          verses: [verse({ text: 'beacon' })],
        }),
      ],
    });
    const r = search(b, 'beacon');
    expect(r[0]!.results).toHaveLength(1);
    expect(r[0]!.results[0]!.matchType).toBe('exact-title');
  });

  it('groups results by section and omits sections with no matches', () => {
    const b = book(
      { title: 'S0', songs: [song({ title: 'Foo' })] },
      { title: 'S1', songs: [song({ title: 'Bar' })] },
      { title: 'S2', songs: [song({ title: 'Foo Again' })] },
    );
    const r = search(b, 'foo');
    expect(r).toHaveLength(2);
    expect(r[0]!.sectionIndex).toBe(0);
    expect(r[1]!.sectionIndex).toBe(2);
  });

  it('scores subtitle above text above author', () => {
    const b = book({
      songs: [
        song({ title: 'A', subtitle: 'xxx' }),
        song({ title: 'B', verses: [verse({ text: 'xxx' })] }),
        song({ title: 'C', author: 'xxx' }),
      ],
    });
    const r = search(b, 'xxx');
    const results = r[0]!.results;
    expect(results.map((x) => x.matchType)).toEqual(['subtitle', 'text', 'author']);
  });

  it('preserves song positional indices in SongId', () => {
    const b = book(
      { songs: [song({ title: 'X' }), song({ title: 'X-Two' })] },
      { songs: [song({ title: 'X-Three' })] },
    );
    const r = search(b, 'x');
    expect(r[0]!.results[0]!.songId).toEqual({ sectionIndex: 0, songIndex: 0 });
    expect(r[0]!.results[1]!.songId).toEqual({ sectionIndex: 0, songIndex: 1 });
    expect(r[1]!.results[0]!.songId).toEqual({ sectionIndex: 1, songIndex: 0 });
  });
});

describe('search — numeric mode', () => {
  it('matches songs by number when the query is digits-only', () => {
    const b = book({
      songs: [
        song({ number: 5, title: 'Five' }),
        song({ number: 50, title: 'Fifty' }),
        song({ number: 12, title: 'Twelve' }),
      ],
    });
    const r = search(b, '5');
    expect(r).toHaveLength(2);
    // First section is the synthetic "Exact Matches"
    expect(r[0]!.sectionTitle).toBe('Exact Matches');
    expect(r[0]!.results).toHaveLength(1);
    expect(r[0]!.results[0]!.combinedTitle).toBe('5: Five');
    expect(r[0]!.results[0]!.matchType).toBe('number');
    // Second is the real section with all numeric matches (5 + 50)
    expect(r[1]!.results.map((x) => x.combinedTitle)).toEqual(['5: Five', '50: Fifty']);
  });

  it('skips the Exact Matches section when every match is exact', () => {
    const b = book({
      songs: [song({ number: 5, title: 'Five' }), song({ number: 5, title: 'Five-Bis' })],
    });
    const r = search(b, '5');
    // No synthetic section — exact-only results stay in their natural section
    expect(r).toHaveLength(1);
    expect(r[0]!.sectionTitle).not.toBe('Exact Matches');
    expect(r[0]!.results).toHaveLength(2);
  });

  it('skips the Exact Matches section when only partial matches exist', () => {
    const b = book({
      songs: [song({ number: 50, title: 'Fifty' }), song({ number: 51, title: 'Fifty-One' })],
    });
    const r = search(b, '5');
    expect(r).toHaveLength(1);
    expect(r[0]!.sectionTitle).not.toBe('Exact Matches');
  });

  it('returns no results for queries that contain no letters and no digits', () => {
    const b = book({ songs: [song({ number: 5, title: 'Five' })] });
    expect(search(b, '...')).toEqual([]);
    expect(search(b, ' - ')).toEqual([]);
  });

  it('falls back to text mode when the query contains any letter', () => {
    const b = book({
      songs: [
        song({ number: 5, title: 'Five' }),
        song({ number: 50, title: 'Fifty' }),
      ],
    });
    // "5f" has a letter, so it's a text search — neither title contains "5f"
    expect(search(b, '5f')).toEqual([]);
  });

  it('extracts digits from queries with non-digit punctuation when no letters present', () => {
    const b = book({ songs: [song({ number: 242, title: 'X' })] });
    const r = search(b, '#242');
    expect(r).toHaveLength(1);
    expect(r[0]!.results[0]!.combinedTitle).toBe('242: X');
  });

  it('does not match songs without a number', () => {
    const b = book({
      songs: [song({ title: 'Untitled' }), song({ number: 5, title: 'Five' })],
    });
    const r = search(b, '5');
    const allResults = r.flatMap((s) => s.results);
    expect(allResults).toHaveLength(1);
    expect(allResults[0]!.combinedTitle).toBe('5: Five');
  });
});
