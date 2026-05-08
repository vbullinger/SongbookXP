import { describe, expect, it } from 'vitest';
import {
  buildAudioIndex,
  resolveAudio,
  resolveAudioFilenames,
  resolveAudioFilenamesFromIndex,
  resolveAudioFromIndex,
} from '../src/audio-resolver.js';
import type { Song, SongId } from '../src/types.js';

const mkSong = (over: Partial<Song>): Song => ({
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

const id: SongId = { sectionIndex: 0, songIndex: 5 };

describe('resolveAudioFilenames — explicit list', () => {
  it('returns audioFileNames verbatim when provided', () => {
    const s = mkSong({ audioFileNames: ['a.m4a', 'b.m4a'] });
    expect(resolveAudioFilenames(s, id, [])).toEqual(['a.m4a', 'b.m4a']);
  });

  it('ignores availableFiles when audioFileNames is set', () => {
    const s = mkSong({ audioFileNames: ['explicit.m4a'] });
    expect(resolveAudioFilenames(s, id, ['0-5.m4a'])).toEqual(['explicit.m4a']);
  });

  it('returns [] when audioFileNames is an empty array (explicit empty is meaningful)', () => {
    const s = mkSong({ audioFileNames: [] });
    expect(resolveAudioFilenames(s, id, ['0-5.m4a'])).toEqual([]);
  });
});

describe('resolveAudioFilenames — convention path', () => {
  it('uses songIndex (not song.number) to derive the filename', () => {
    // The song's metadata `number` is 1, but its position in the section
    // (songIndex) is 0. Per upstream Swift Index.swift, the resolver
    // keys on songIndex. This is the parity bug discovered when audio
    // for "First Audio Sample" (songNumber=1, songIndex=0) was being
    // matched to file "0-1.m4a" instead of "0-0.m4a".
    const s = mkSong({ number: 1 });
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, ['0-0.m4a', '0-1.m4a']),
    ).toEqual(['0-0.m4a']);
  });

  it('finds the single-take file when present', () => {
    const s = mkSong({});
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 5 }, ['0-5.m4a']),
    ).toEqual(['0-5.m4a']);
  });

  it('returns [] when no file matches', () => {
    const s = mkSong({});
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 5 }, ['0-6.m4a']),
    ).toEqual([]);
  });

  it('returns multi-take files lexically sorted', () => {
    const s = mkSong({});
    const available = ['0-2-1.m4a', '0-2-0.m4a', '0-2-2.m4a'];
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 2 }, available),
    ).toEqual(['0-2-0.m4a', '0-2-1.m4a', '0-2-2.m4a']);
  });

  it('orders the single-take file before takes (lexical sort puts "S-N.m4a" after "S-N-X.m4a"... wait, the other way)', () => {
    // Upstream sorts stems lexically. Stem "0-1" sorts AFTER "0-1-0" and
    // "0-1-1" because "-" (0x2D) < "." (0x2E)... actually that's wrong
    // because we sort by full filename. "0-1.m4a" vs "0-1-0.m4a":
    // comparing char-by-char, first 3 chars equal, then "." vs "-", and
    // "-" (45) < "." (46), so "0-1-0.m4a" < "0-1.m4a" lexically. So
    // takes come first, then the single-take file. Match upstream.
    const s = mkSong({});
    const available = ['0-1-1.m4a', '0-1.m4a', '0-1-0.m4a'];
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 1 }, available),
    ).toEqual(['0-1-0.m4a', '0-1-1.m4a', '0-1.m4a']);
  });

  it('does not match files that share a prefix but are different songs', () => {
    const s = mkSong({});
    const available = ['0-5.m4a', '0-50.m4a', '0-55.m4a', '0-5x.m4a'];
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 5 }, available),
    ).toEqual(['0-5.m4a']);
  });

  it('uses the SongId sectionIndex when deriving filenames', () => {
    const s = mkSong({});
    expect(
      resolveAudioFilenames(s, { sectionIndex: 2, songIndex: 5 }, ['0-5.m4a', '2-5.m4a']),
    ).toEqual(['2-5.m4a']);
  });

  it('accepts mp3, wav, and caf in addition to m4a', () => {
    const s = mkSong({});
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, [
        '0-0.mp3',
        '0-0.wav',
        '0-0.caf',
      ]),
    ).toEqual(['0-0.caf', '0-0.mp3', '0-0.wav']);
  });

  it('ignores files with unsupported extensions', () => {
    const s = mkSong({});
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, [
        '0-0.txt',
        '0-0.json',
        '0-0.m4a',
      ]),
    ).toEqual(['0-0.m4a']);
  });
});

describe('resolveAudio — wraps filenames as PlayableItems', () => {
  it('produces one item per resolved filename with correct indices', () => {
    const s = mkSong({ title: 't', author: 'au' });
    const items = resolveAudio(s, { sectionIndex: 1, songIndex: 9 }, ['1-9.m4a', '1-9-0.m4a']);
    expect(items).toHaveLength(2);
    expect(items[0]!.id).toEqual({ sectionIndex: 1, songIndex: 9, playableItemIndex: 0 });
    expect(items[0]!.audioFileName).toBe('1-9-0.m4a');
    expect(items[0]!.title).toBe('t');
    expect(items[0]!.author).toBe('au');
    expect(items[1]!.id.playableItemIndex).toBe(1);
    expect(items[1]!.audioFileName).toBe('1-9.m4a');
  });
});

// Lock-in: the exact ordered output of resolveAudioFilenames against
// realistic multi-take fixtures. Phase 1.4 of the perf overhaul will add
// a sibling resolveAudioFromIndex(song, songId, audioIndex) backed by a
// pre-built Map. These tests assert behavior that the new function must
// replicate verbatim — same returned ordered array for every case below.
describe('resolveAudioFilenames — order lock-in for index-based variant', () => {
  // Realistic IALC-shape: section 0 contains hundreds of songs, with
  // multi-take audio for some (e.g. 0-200-0/1/2/3/4 has 5 takes per
  // Plan §11 Appendix A's measured invariants). These exact orderings
  // are what the in-app NowPlayingBar take-skip controls iterate.

  it('locks 5-take ordering for section 0 song 200', () => {
    const s = mkSong({});
    const available = [
      '0-200-3.m4a',
      '0-200-1.m4a',
      '0-200-4.m4a',
      '0-200-0.m4a',
      '0-200-2.m4a',
      // Decoys from neighboring songs:
      '0-199.m4a',
      '0-201.m4a',
      '0-2000.m4a', // shares prefix but is a different song number
    ];
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 200 }, available),
    ).toEqual([
      '0-200-0.m4a',
      '0-200-1.m4a',
      '0-200-2.m4a',
      '0-200-3.m4a',
      '0-200-4.m4a',
    ]);
  });

  it('locks single-take + multi-take coexistence (single goes last per lex sort)', () => {
    const s = mkSong({});
    const available = ['0-10-2.m4a', '0-10.m4a', '0-10-0.m4a', '0-10-1.m4a'];
    expect(
      resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 10 }, available),
    ).toEqual(['0-10-0.m4a', '0-10-1.m4a', '0-10-2.m4a', '0-10.m4a']);
  });

  it('locks behavior on a typical IALC-shaped section (3 sections, dispersed takes)', () => {
    // Verify all three section indices resolve correctly against a
    // realistic mixed pool. This is the multi-section invariant the
    // index-based variant must preserve.
    const available = [
      // Section 0 has takes for some songs:
      '0-0.m4a',
      '0-1-0.m4a',
      '0-1-1.m4a',
      '0-2.m4a',
      // Section 1 has a single-take pattern:
      '1-0.m4a',
      '1-1.m4a',
      // Section 2 has both:
      '2-0-0.m4a',
      '2-0-1.m4a',
      '2-1.m4a',
    ];
    const s = mkSong({});
    expect(resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, available)).toEqual(['0-0.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 1 }, available)).toEqual(['0-1-0.m4a', '0-1-1.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 2 }, available)).toEqual(['0-2.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 1, songIndex: 0 }, available)).toEqual(['1-0.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 1, songIndex: 1 }, available)).toEqual(['1-1.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 2, songIndex: 0 }, available)).toEqual(['2-0-0.m4a', '2-0-1.m4a']);
    expect(resolveAudioFilenames(s, { sectionIndex: 2, songIndex: 1 }, available)).toEqual(['2-1.m4a']);
  });

  it('locks: an explicit audioFileNames list is returned verbatim and ignores availableFiles', () => {
    // The explicit-list path (rule 1 in the resolver doc) must remain
    // untouched by the index-based variant. Locking the verbatim-pass
    // behavior to prevent regressions.
    const s = mkSong({ audioFileNames: ['custom.m4a', 'extra.mp3', 'finale.wav'] });
    expect(resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, ['0-0.m4a', '0-0-1.m4a'])).toEqual([
      'custom.m4a',
      'extra.mp3',
      'finale.wav',
    ]);
  });

  it('locks: empty audioFileNames means no audio (intentional, not "fall back to convention")', () => {
    // Important contract: an explicit empty array means "no audio for
    // this song" and MUST NOT fall through to the convention path.
    const s = mkSong({ audioFileNames: [] });
    expect(resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, ['0-0.m4a'])).toEqual([]);
  });

  it('locks: returned array is a new array each call (caller may sort/mutate)', () => {
    // The current implementation returns a freshly-allocated array.
    // Phase 1.4 may store a Map of ordered arrays internally — those
    // arrays must NOT be returned by reference (a caller could otherwise
    // mutate the cached Map). Lock the reference-identity contract.
    const s = mkSong({});
    const a = resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, ['0-0.m4a']);
    const b = resolveAudioFilenames(s, { sectionIndex: 0, songIndex: 0 }, ['0-0.m4a']);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// Phase 1.4 of the perf overhaul. The new index-based resolver must
// produce IDENTICAL ordered output to the legacy resolver across every
// case the lock-in tests above cover. This suite parallels each lock-in
// test with the index-based call so we have proof of equivalence.
describe('resolveAudioFromIndex / resolveAudioFilenamesFromIndex — equivalence', () => {
  const cases: { name: string; song: Song; songId: SongId; available: string[]; expected: string[] }[] = [
    {
      name: 'single-take',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 5 },
      available: ['0-5.m4a'],
      expected: ['0-5.m4a'],
    },
    {
      name: 'no match',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 5 },
      available: ['0-6.m4a'],
      expected: [],
    },
    {
      name: 'multi-take lex sort',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 2 },
      available: ['0-2-1.m4a', '0-2-0.m4a', '0-2-2.m4a'],
      expected: ['0-2-0.m4a', '0-2-1.m4a', '0-2-2.m4a'],
    },
    {
      name: 'single + multi take coexistence',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 1 },
      available: ['0-1-1.m4a', '0-1.m4a', '0-1-0.m4a'],
      expected: ['0-1-0.m4a', '0-1-1.m4a', '0-1.m4a'],
    },
    {
      name: 'prefix-not-substring',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 5 },
      available: ['0-5.m4a', '0-50.m4a', '0-55.m4a', '0-5x.m4a'],
      expected: ['0-5.m4a'],
    },
    {
      name: 'mixed extensions',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 0 },
      available: ['0-0.mp3', '0-0.wav', '0-0.caf'],
      expected: ['0-0.caf', '0-0.mp3', '0-0.wav'],
    },
    {
      name: 'IALC-shape 5-take',
      song: mkSong({}),
      songId: { sectionIndex: 0, songIndex: 200 },
      available: [
        '0-200-3.m4a',
        '0-200-1.m4a',
        '0-200-4.m4a',
        '0-200-0.m4a',
        '0-200-2.m4a',
        '0-199.m4a',
        '0-201.m4a',
        '0-2000.m4a',
      ],
      expected: [
        '0-200-0.m4a',
        '0-200-1.m4a',
        '0-200-2.m4a',
        '0-200-3.m4a',
        '0-200-4.m4a',
      ],
    },
  ];

  for (const c of cases) {
    it(`matches legacy resolveAudioFilenames — ${c.name}`, () => {
      const idx = buildAudioIndex(c.available);
      const fromIndex = resolveAudioFilenamesFromIndex(c.song, c.songId, idx);
      const fromLegacy = resolveAudioFilenames(c.song, c.songId, c.available);
      expect(fromIndex).toEqual(c.expected);
      expect(fromIndex).toEqual(fromLegacy);
    });
  }

  it('explicit audioFileNames pass through verbatim (rule 1 takes precedence)', () => {
    const s = mkSong({ audioFileNames: ['custom.m4a', 'extra.mp3'] });
    const idx = buildAudioIndex(['0-0.m4a']);
    expect(resolveAudioFilenamesFromIndex(s, { sectionIndex: 0, songIndex: 0 }, idx)).toEqual([
      'custom.m4a',
      'extra.mp3',
    ]);
  });

  it('returned array is a fresh allocation (caller may mutate)', () => {
    const idx = buildAudioIndex(['0-0.m4a']);
    const a = resolveAudioFilenamesFromIndex(mkSong({}), { sectionIndex: 0, songIndex: 0 }, idx);
    const b = resolveAudioFilenamesFromIndex(mkSong({}), { sectionIndex: 0, songIndex: 0 }, idx);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('resolveAudioFromIndex wraps the same filenames as PlayableItems', () => {
    const idx = buildAudioIndex(['1-9.m4a', '1-9-0.m4a']);
    const items = resolveAudioFromIndex(
      mkSong({ title: 't', author: 'au' }),
      { sectionIndex: 1, songIndex: 9 },
      idx,
    );
    expect(items).toHaveLength(2);
    expect(items[0]!.audioFileName).toBe('1-9-0.m4a');
    expect(items[0]!.id).toEqual({ sectionIndex: 1, songIndex: 9, playableItemIndex: 0 });
    expect(items[1]!.audioFileName).toBe('1-9.m4a');
    expect(items[1]!.id.playableItemIndex).toBe(1);
  });
});

describe('buildAudioIndex', () => {
  it('groups files by `${sectionIndex}-${songIndex}`', () => {
    const idx = buildAudioIndex(['0-0.m4a', '0-1-0.m4a', '0-1-1.m4a', '1-0.m4a']);
    expect(idx.get('0-0')).toEqual(['0-0.m4a']);
    expect(idx.get('0-1')).toEqual(['0-1-0.m4a', '0-1-1.m4a']);
    expect(idx.get('1-0')).toEqual(['1-0.m4a']);
  });

  it('skips entries with unsupported extensions', () => {
    const idx = buildAudioIndex(['0-0.m4a', '0-0.txt', '0-0.json']);
    expect(idx.get('0-0')).toEqual(['0-0.m4a']);
  });

  it('returns an empty map for an empty input', () => {
    expect(buildAudioIndex([]).size).toBe(0);
  });

  it('survives malformed stems (no hyphen) without crashing', () => {
    const idx = buildAudioIndex(['weird.m4a', '0-0.m4a']);
    // weird.m4a has no hyphen, so it has no `S-I` prefix to key on; it's
    // skipped. 0-0.m4a is grouped normally.
    expect(idx.get('weird')).toBeUndefined();
    expect(idx.get('0-0')).toEqual(['0-0.m4a']);
  });
});
