// Deterministic 751-song synthetic Book that matches the shape of the
// real IALC archive captured in Plan.html §11 Appendix A and exercised
// by integration.songbook.test.ts. Used by the vitest bench harness so
// performance numbers are reproducible without redistributing the real
// archive (which is private to the IALC committee).
//
// Invariants matched:
//   - 3 sections with 616 / 44 / 91 songs (751 total)
//   - 750 of 751 songs carry song.number; 1 does not
//   - ~336 verses across the book carry chorusIndex
//   - ~46 verses carry repeatText
//   - exactly 1 song carries a relatedSongs entry
//   - audioFileNames is undefined for every song (real IALC books rely
//     on the convention path; integration test locks this)
//
// Verse text is generated from a deterministic word pool so that text
// search benches are reproducible. Authors / titles are deterministic
// patterns. No randomness.

import type { Book, Section, Song, Verse } from '../src/types.js';

const SECTION_TITLES: readonly (string | undefined)[] = [
  'Songs of Believers',
  'Uskovaisten Lauluja',
  'Hymns of Believers',
];
const SECTION_SIZES: readonly number[] = [616, 44, 91];
const TOTAL_SONGS = SECTION_SIZES.reduce((n, s) => n + s, 0); // 751
// One song in the real archive lacks a number; pick the last song of
// section 2 so it's deterministic and easy to assert.
const NO_NUMBER_AT: { sectionIndex: number; songIndex: number } = {
  sectionIndex: 2,
  songIndex: 90,
};
// Spread chorusIndex / repeatText across the book deterministically.
const CHORUS_INDEX_TARGET = 336;
const REPEAT_TEXT_TARGET = 46;

// Word pool drawn from public-domain hymn lines. Verses are stitched
// together from this pool deterministically so text search has stable
// hit counts across runs.
const WORDS: readonly string[] = [
  'praise', 'sing', 'bless', 'name', 'lord', 'glory', 'high', 'heaven',
  'earth', 'light', 'love', 'mercy', 'grace', 'truth', 'word', 'spirit',
  'son', 'father', 'king', 'savior', 'shepherd', 'rock', 'tower', 'fortress',
  'morning', 'evening', 'rest', 'peace', 'joy', 'hope', 'faith', 'cross',
  'cup', 'feast', 'song', 'voice', 'hand', 'heart', 'soul', 'mind',
  'wonder', 'grace', 'eternal', 'holy', 'pure', 'true', 'forever', 'amen',
];

// Tiny linear-congruential pseudo-random with a fixed seed — guarantees
// the same fixture across runs and machines. Not cryptographic; we just
// want determinism.
class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // Numerical Recipes LCG constants, mod 2^32.
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.next() % arr.length]!;
  }
  range(min: number, maxExclusive: number): number {
    return min + (this.next() % (maxExclusive - min));
  }
}

function buildVerse(
  rng: Rng,
  index: number,
  withChorusIndex: boolean,
  withRepeatText: boolean,
  isChorus: boolean,
): Verse {
  const wordCount = rng.range(8, 24);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(rng.pick(WORDS));
  const text = words.join(' ');
  return {
    title: undefined,
    number: index + 1,
    text,
    isChorusInt: isChorus ? 1 : undefined,
    isChorus,
    chorusIndex: withChorusIndex ? 0 : undefined,
    repeatText: withRepeatText ? words.slice(0, 3).join(' ') + '.' : undefined,
  };
}

function buildSong(
  rng: Rng,
  globalIndex: number,
  sectionIndex: number,
  songIndex: number,
  withRelatedSong: boolean,
  carriesNumber: boolean,
  chorusIndexBudget: { remaining: number },
  repeatTextBudget: { remaining: number },
): Song {
  const verseCount = rng.range(2, 6);
  const verses: Verse[] = [];
  for (let v = 0; v < verseCount; v++) {
    const wantsChorusIndex = chorusIndexBudget.remaining > 0 && rng.next() % 3 === 0;
    const wantsRepeatText = repeatTextBudget.remaining > 0 && rng.next() % 17 === 0;
    if (wantsChorusIndex) chorusIndexBudget.remaining--;
    if (wantsRepeatText) repeatTextBudget.remaining--;
    verses.push(buildVerse(rng, v, wantsChorusIndex, wantsRepeatText, v === 0 && verseCount > 1 ? false : false));
  }
  return {
    number: carriesNumber ? globalIndex + 1 : undefined,
    title: `Song ${globalIndex + 1}`,
    subtitle: undefined,
    author: rng.pick(['Wesley', 'Watts', 'Crosby', 'Bunyan', undefined]),
    year: undefined,
    audioFileNames: undefined, // convention path, matches real IALC books
    relatedSongs: withRelatedSong ? [{ sectionIndex: 0, songIndex: 0 }] : undefined,
    verses,
  };
}

/**
 * Build the synthetic 751-song book. Deterministic; the same call
 * always produces the same Book.
 */
export function buildSynthBook(): Book {
  const rng = new Rng(0xc0ffee);
  const chorusIndexBudget = { remaining: CHORUS_INDEX_TARGET };
  const repeatTextBudget = { remaining: REPEAT_TEXT_TARGET };

  const sections: Section[] = SECTION_SIZES.map((size, sectionIndex) => {
    const songs: Song[] = [];
    for (let songIndex = 0; songIndex < size; songIndex++) {
      const globalIndex =
        SECTION_SIZES.slice(0, sectionIndex).reduce((n, s) => n + s, 0) + songIndex;
      const carriesNumber = !(
        sectionIndex === NO_NUMBER_AT.sectionIndex && songIndex === NO_NUMBER_AT.songIndex
      );
      const withRelatedSong = sectionIndex === 0 && songIndex === 0;
      songs.push(
        buildSong(
          rng,
          globalIndex,
          sectionIndex,
          songIndex,
          withRelatedSong,
          carriesNumber,
          chorusIndexBudget,
          repeatTextBudget,
        ),
      );
    }
    return {
      title: SECTION_TITLES[sectionIndex],
      songs,
    };
  });

  return {
    title: 'Synthetic IALC-shape Book',
    contactEmail: undefined,
    updateURL: undefined,
    version: 1,
    sections,
  };
}

/**
 * Synthetic available-files list matching the resolver's convention path
 * for the synth book. Single-take audio for every song, with a small
 * number of multi-take songs to exercise the take-ordering path.
 */
export function buildSynthAudioFilenames(): readonly string[] {
  const out: string[] = [];
  for (let s = 0; s < SECTION_SIZES.length; s++) {
    for (let i = 0; i < SECTION_SIZES[s]!; i++) {
      out.push(`${s}-${i}.m4a`);
      // Add takes for every 50th song to exercise multi-take resolution.
      if (i % 50 === 0 && i > 0) {
        out.push(`${s}-${i}-0.m4a`);
        out.push(`${s}-${i}-1.m4a`);
      }
    }
  }
  return out;
}

export const SYNTH_BOOK_TOTAL_SONGS = TOTAL_SONGS;
export const SYNTH_BOOK_SECTION_SIZES = SECTION_SIZES;

/**
 * Serialize a domain Book back to wire-format JSON (the field names used
 * inside `.songbook` files — `bookTitle`, `songTitle`, `verseIsChorus`,
 * etc.). Inverse of the transforms in `schema.ts`. Used by benches that
 * exercise `decodeBookJson` / `decodeSongbookArchive` against a
 * realistic 750-song input without redistributing the IALC archive.
 *
 * Only emits fields that round-trip through the schema; `isChorus` is
 * derived from `isChorusInt` so we drop the boolean and emit the int.
 */
export function bookToWireJson(book: Book): string {
  const wire: Record<string, unknown> = {
    bookTitle: book.title,
    version: book.version,
    sections: book.sections.map((s) => ({
      sectionTitle: s.title,
      songs: s.songs.map((song) => {
        const out: Record<string, unknown> = {
          songNumber: song.number,
          songTitle: song.title,
          songSubtitle: song.subtitle,
          songAuthor: song.author,
          songYear: song.year,
          audioFileNames: song.audioFileNames,
          relatedSongs: song.relatedSongs?.map((r) => ({
            relatedSongSectionIndex: r.sectionIndex,
            relatedSongIndex: r.songIndex,
          })),
          verses: song.verses.map((v) => ({
            verseTitle: v.title,
            verseNumber: v.number,
            verseText: v.text,
            verseIsChorus: v.isChorusInt,
            verseChorusIndex: v.chorusIndex,
            verseRepeatText: v.repeatText,
          })),
        };
        // Strip undefined keys to match real-archive book.json shape.
        for (const k of Object.keys(out)) {
          if (out[k] === undefined) delete out[k];
        }
        return out;
      }),
    })),
  };
  if (book.contactEmail !== undefined) wire.contactEmail = book.contactEmail;
  if (book.updateURL !== undefined) wire.updateURL = book.updateURL;
  return JSON.stringify(wire);
}
