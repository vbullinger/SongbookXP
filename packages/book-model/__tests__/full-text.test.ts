// Covers each branch of Song.fullText. Uses synthetic, non-lyrical text so
// the expected strings pin down structure only.
import { describe, expect, it } from 'vitest';
import { fullText } from '../src/full-text.js';
import type { Song, Verse } from '../src/types.js';

const verse = (over: Partial<Verse>): Verse => ({
  title: undefined,
  number: undefined,
  text: undefined,
  isChorusInt: undefined,
  isChorus: false,
  chorusIndex: undefined,
  repeatText: undefined,
  ...over,
});

const song = (over: Partial<Song>): Song => ({
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

describe('fullText', () => {
  it('emits just the combined title for an empty song', () => {
    expect(fullText(song({}))).toBe('Untitled Song\n');
  });

  it('prepends subtitle after combined title', () => {
    expect(fullText(song({ title: 'A', subtitle: 'B' }))).toBe('A\nB\n');
  });

  it('prefixes numbered verses with the number', () => {
    const s = song({ title: 'A', verses: [verse({ number: 1, text: 'line' })] });
    expect(fullText(s)).toBe('A\n\n1: line\n');
  });

  it('prefixes chorus verses with "Chorus: "', () => {
    const s = song({
      title: 'A',
      verses: [verse({ isChorusInt: 1, isChorus: true, text: 'line' })],
    });
    expect(fullText(s)).toBe('A\n\nChorus: line\n');
  });

  it('emits verse title on its own preceding line', () => {
    const s = song({
      title: 'A',
      verses: [verse({ title: 'vt', number: 2, text: 'line' })],
    });
    expect(fullText(s)).toBe('A\n\nvt\n2: line\n');
  });

  it('appends " Chorus" when verse.chorusIndex is present', () => {
    const s = song({
      title: 'A',
      verses: [verse({ number: 1, text: 'line', chorusIndex: 0 })],
    });
    expect(fullText(s)).toBe('A\n\n1: line Chorus\n');
  });

  it('appends author then year at the end when present', () => {
    const s = song({ title: 'A', author: 'au', year: '1900' });
    expect(fullText(s)).toBe('A\n\nau\n1900');
  });

  it('omits verse number prefix when both number and chorus flag are absent', () => {
    const s = song({ title: 'A', verses: [verse({ text: 'line' })] });
    expect(fullText(s)).toBe('A\n\nline\n');
  });

  it('omits empty verse bodies but still emits the leading newline', () => {
    const s = song({ title: 'A', verses: [verse({ number: 1 })] });
    expect(fullText(s)).toBe('A\n\n1: \n');
  });

  it('preserves verse order', () => {
    const s = song({
      title: 'A',
      verses: [
        verse({ number: 1, text: 'one' }),
        verse({ number: 2, text: 'two' }),
      ],
    });
    expect(fullText(s)).toBe('A\n\n1: one\n\n2: two\n');
  });
});
