// Integration test against the real .songbook files on a developer's
// machine. Skipped when the files are absent so CI and other contributors
// are unaffected. Asserts the structural invariants we measured directly
// from the archives during scoping (Plan.html Appendix A).
//
// Set the paths via env vars to point at your local copies, e.g.:
//   SONGBOOK_NO_TUNES_PATH=/path/to/no_tunes.songbook \
//   SONGBOOK_WITH_TUNES_PATH=/path/to/with_tunes.songbook \
//     pnpm --filter @songbook/book-model test

import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeSongbookArchive } from '../src/decode.js';
import type { Book } from '../src/types.js';

const NO_TUNES = process.env.SONGBOOK_NO_TUNES_PATH ?? '';
const WITH_TUNES = process.env.SONGBOOK_WITH_TUNES_PATH ?? '';

const haveNoTunes = NO_TUNES !== '' && existsSync(NO_TUNES);
const haveWithTunes = WITH_TUNES !== '' && existsSync(WITH_TUNES);

describe.skipIf(!haveNoTunes)('no_tunes.songbook', () => {
  let book: Book;
  let audioFileNames: readonly string[];

  beforeAll(() => {
    const decoded = decodeSongbookArchive(readFileSync(NO_TUNES));
    book = decoded.book;
    audioFileNames = decoded.audioFileNames;
  });

  it('decodes with expected top-level fields', () => {
    expect(book.title).toBe('Songs & Hymns of Believers');
    expect(book.version).toBe(6);
    expect(book.contactEmail).toBe('IALCSongbook@gmail.com');
  });

  it('has exactly three sections with the measured song counts', () => {
    expect(book.sections).toHaveLength(3);
    expect(book.sections[0]!.title).toBe('Songs of Believers');
    expect(book.sections[0]!.songs).toHaveLength(616);
    expect(book.sections[1]!.title).toBe('Uskovaisten Lauluja');
    expect(book.sections[1]!.songs).toHaveLength(44);
    expect(book.sections[2]!.title).toBe('Hymns of Believers');
    expect(book.sections[2]!.songs).toHaveLength(91);
  });

  it('carries no audio files', () => {
    expect(audioFileNames).toHaveLength(0);
  });

  it('has the invariants observed during scoping', () => {
    const allSongs = book.sections.flatMap((s) => s.songs);
    expect(allSongs).toHaveLength(751);

    const songsWithNumber = allSongs.filter((s) => s.number !== undefined);
    expect(songsWithNumber).toHaveLength(750);

    const versesWithChorusIndex = allSongs.flatMap((s) => s.verses).filter((v) => v.chorusIndex !== undefined);
    expect(versesWithChorusIndex).toHaveLength(336);

    const versesWithRepeatText = allSongs.flatMap((s) => s.verses).filter((v) => v.repeatText !== undefined);
    expect(versesWithRepeatText).toHaveLength(46);

    const songsWithRelated = allSongs.filter((s) => s.relatedSongs !== undefined && s.relatedSongs.length > 0);
    expect(songsWithRelated).toHaveLength(1);
  });
});

describe.skipIf(!haveWithTunes)('with_tunes.songbook', () => {
  let book: Book;
  let audioFileNames: readonly string[];

  beforeAll(() => {
    const decoded = decodeSongbookArchive(readFileSync(WITH_TUNES));
    book = decoded.book;
    audioFileNames = decoded.audioFileNames;
  });

  it('is the same book as no_tunes with 702 audio files', () => {
    expect(book.title).toBe('Songs & Hymns of Believers');
    expect(book.version).toBe(6);
    expect(audioFileNames).toHaveLength(702);
  });

  it('has the expected audio-naming mix: single-take + multi-take + section-level', () => {
    const names = new Set(audioFileNames);
    // Known single-takes from scoping
    expect(names.has('0-242.m4a')).toBe(true);
    expect(names.has('0-540.m4a')).toBe(true);
    // Known multi-takes from scoping
    expect(names.has('0-200-0.m4a')).toBe(true);
    expect(names.has('0-200-1.m4a')).toBe(true);
    // Section-level (songIndex 0 — first song in each section)
    expect(names.has('0-0.m4a')).toBe(true);
    expect(names.has('1-0.m4a')).toBe(true);
    expect(names.has('2-0.m4a')).toBe(true);
  });

  it('no song in this book carries an explicit audioFileNames — all rely on the convention', () => {
    const allSongs = book.sections.flatMap((s) => s.songs);
    const withExplicit = allSongs.filter((s) => s.audioFileNames !== undefined);
    expect(withExplicit).toHaveLength(0);
  });
});
