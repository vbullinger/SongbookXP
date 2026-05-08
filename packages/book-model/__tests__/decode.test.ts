// Invariants ported from Swift-Rewrite's BookModelTests/DecodingTests.swift.
// Same JSON fixtures, same assertions, so regressions here show up as exact
// parity losses with the reference implementation.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeBookJson, BookDecodeError } from '../src/decode.js';

const FIXTURES = join(import.meta.dirname!, '..', '__fixtures__');
const load = (name: string) => readFileSync(join(FIXTURES, `${name}.json`), 'utf8');

describe('decodeBookJson — minimal', () => {
  it('decodes the empty shell', () => {
    const b = decodeBookJson(load('minimal'));
    expect(b.title).toBe('minimal');
    expect(b.contactEmail).toBeUndefined();
    expect(b.updateURL).toBeUndefined();
    expect(b.version).toBe(1);
    expect(b.sections).toHaveLength(0);
  });

  it('decodes a section with no songs', () => {
    const b = decodeBookJson(load('minimalWithSection'));
    expect(b.sections).toHaveLength(1);
    expect(b.sections[0]!.title).toBeUndefined();
    expect(b.sections[0]!.songs).toHaveLength(0);
  });

  it('decodes a song with no verses', () => {
    const b = decodeBookJson(load('minimalWithSong'));
    const s = b.sections[0]!.songs[0]!;
    expect(s.author).toBeUndefined();
    expect(s.number).toBeUndefined();
    expect(s.relatedSongs).toBeUndefined();
    expect(s.subtitle).toBeUndefined();
    expect(s.title).toBeUndefined();
    expect(s.verses).toHaveLength(0);
    expect(s.year).toBeUndefined();
  });

  it('decodes an empty verse', () => {
    const b = decodeBookJson(load('minimalWithVerse'));
    const v = b.sections[0]!.songs[0]!.verses[0]!;
    expect(v.title).toBeUndefined();
    expect(v.number).toBeUndefined();
    expect(v.text).toBeUndefined();
    expect(v.isChorusInt).toBeUndefined();
    expect(v.isChorus).toBe(false);
    expect(v.chorusIndex).toBeUndefined();
    expect(v.repeatText).toBeUndefined();
  });
});

describe('decodeBookJson — maximum', () => {
  const b = decodeBookJson(load('maximum'));

  it('captures top-level fields', () => {
    expect(b.title).toBe('Red Songbook');
    expect(b.contactEmail).toBe('feedback@paulhimes.com');
    expect(b.version).toBe(1);
    expect(b.updateURL).toBe('http://www.paulhimes.com/songbook/default.json');
    expect(b.sections).toHaveLength(1);
  });

  it('captures the first song and its verses', () => {
    const s = b.sections[0]!.songs[0]!;
    expect(s.audioFileNames).toEqual(['The first song.m4a']);
    expect(s.author).toBe('Paul Himes');
    expect(s.number).toBe(1);
    expect(s.subtitle).toBe('The first song.');
    expect(s.title).toBe('Welcome to Red Songbook');
    expect(s.year).toBe('2020');
    expect(s.relatedSongs).toHaveLength(1);
    expect(s.relatedSongs![0]).toEqual({ sectionIndex: 0, songIndex: 1 });
    expect(s.verses).toHaveLength(2);
  });

  it('decodes verseIsChorus as both int and boolean', () => {
    const [v1, v2] = b.sections[0]!.songs[0]!.verses;
    expect(v1!.isChorusInt).toBe(1);
    expect(v1!.isChorus).toBe(true);
    expect(v2!.isChorusInt).toBe(0);
    expect(v2!.isChorus).toBe(false);
  });

  it('decodes verseChorusIndex when present', () => {
    const v2 = b.sections[0]!.songs[0]!.verses[1]!;
    expect(v2.chorusIndex).toBe(0);
  });

  it('decodes verseRepeatText', () => {
    const v1 = b.sections[0]!.songs[0]!.verses[0]!;
    expect(v1.repeatText).toBe('.songbook files.');
  });
});

describe('decodeBookJson — error paths', () => {
  it('throws on invalid JSON', () => {
    expect(() => decodeBookJson('{not json')).toThrow(BookDecodeError);
  });

  it('throws on empty input', () => {
    expect(() => decodeBookJson('')).toThrow(BookDecodeError);
  });

  it('throws on schema-valid JSON that is not a Book', () => {
    expect(() => decodeBookJson('{}')).toThrow(BookDecodeError);
  });

  it('throws when bookTitle is missing', () => {
    expect(() => decodeBookJson('{"version": 1, "sections": []}')).toThrow(BookDecodeError);
  });

  it('throws when songYear is a number rather than a string (wire-format sensitivity)', () => {
    const bad = JSON.stringify({
      bookTitle: 'x',
      version: 1,
      sections: [{ songs: [{ verses: [], songYear: 1850 }] }],
    });
    expect(() => decodeBookJson(bad)).toThrow(BookDecodeError);
  });
});
