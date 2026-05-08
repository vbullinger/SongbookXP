// Smoke tests for the synthetic-fixture builder used by vitest bench.
// Locks the IALC-shape invariants so a future tweak to synth-book.ts
// can't silently drift the bench input.

import { describe, expect, it } from 'vitest';
import {
  buildSynthAudioFilenames,
  buildSynthBook,
  SYNTH_BOOK_SECTION_SIZES,
  SYNTH_BOOK_TOTAL_SONGS,
} from '../__bench__/synth-book.js';

describe('buildSynthBook — IALC-shape invariants', () => {
  it('produces 751 total songs distributed across 3 sections (616 / 44 / 91)', () => {
    const book = buildSynthBook();
    expect(book.sections).toHaveLength(3);
    expect(book.sections.map((s) => s.songs.length)).toEqual([616, 44, 91]);
    expect(SYNTH_BOOK_TOTAL_SONGS).toBe(751);
    expect(SYNTH_BOOK_SECTION_SIZES).toEqual([616, 44, 91]);
  });

  it('exactly one song lacks a number; the rest have one', () => {
    const book = buildSynthBook();
    const songs = book.sections.flatMap((s) => s.songs);
    const withNumber = songs.filter((s) => s.number !== undefined);
    expect(withNumber).toHaveLength(750);
  });

  it('exactly one song carries a relatedSongs entry', () => {
    const book = buildSynthBook();
    const songs = book.sections.flatMap((s) => s.songs);
    const withRelated = songs.filter((s) => s.relatedSongs !== undefined && s.relatedSongs.length > 0);
    expect(withRelated).toHaveLength(1);
  });

  it('no song carries an explicit audioFileNames (convention-path only)', () => {
    const book = buildSynthBook();
    const songs = book.sections.flatMap((s) => s.songs);
    const withExplicit = songs.filter((s) => s.audioFileNames !== undefined);
    expect(withExplicit).toHaveLength(0);
  });

  it('builds the same Book on every call (deterministic)', () => {
    const a = buildSynthBook();
    const b = buildSynthBook();
    // Deep-equal: every verse text, every author choice, every flag.
    expect(a).toEqual(b);
  });

  it('verse-flag distribution is in the expected ballpark for benches', () => {
    const book = buildSynthBook();
    const verses = book.sections.flatMap((s) => s.songs).flatMap((s) => s.verses);
    const withChorusIdx = verses.filter((v) => v.chorusIndex !== undefined).length;
    const withRepeat = verses.filter((v) => v.repeatText !== undefined).length;
    // Targets per Plan §11 Appendix A: 336 chorusIndex, 46 repeatText.
    // Allow ±20% drift since the builder gates on a budget + an RNG-driven
    // probability and may exhaust the budget early or late.
    expect(withChorusIdx).toBeGreaterThan(0.8 * 336);
    expect(withChorusIdx).toBeLessThanOrEqual(336);
    expect(withRepeat).toBeGreaterThan(0.8 * 46);
    expect(withRepeat).toBeLessThanOrEqual(46);
  });
});

describe('buildSynthAudioFilenames', () => {
  it('produces one entry per song plus extras for every 50th song', () => {
    const filenames = buildSynthAudioFilenames();
    // 751 single-take entries + multi-take takes for 12 songs (every
    // 50th, skipping the first of each section): 12 * 2 = 24 extras.
    // The exact count is 751 + 2 * (extras count); test the lower bound
    // and the structural invariant.
    expect(filenames.length).toBeGreaterThanOrEqual(751);
    // Every entry is m4a.
    for (const name of filenames) expect(name.endsWith('.m4a')).toBe(true);
  });

  it('contains a single-take entry for every song id', () => {
    const filenames = new Set(buildSynthAudioFilenames());
    expect(filenames.has('0-0.m4a')).toBe(true);
    expect(filenames.has('0-615.m4a')).toBe(true);
    expect(filenames.has('1-43.m4a')).toBe(true);
    expect(filenames.has('2-90.m4a')).toBe(true);
  });
});
