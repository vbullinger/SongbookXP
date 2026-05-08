// Performance benchmarks. Run with:
//
//   pnpm --filter @songbook/book-model bench
//
// Default fixture is the deterministic 751-song synthetic Book in
// __bench__/synth-book.ts — same shape as the real IALC archive but
// redistributable, so CI and dev machines can run the bench without
// the private archive.
//
// Override targets to run against the real archives (locally) by
// setting these env vars to absolute paths:
//
//   SONGBOOK_NO_TUNES_PATH=/path/to/no_tunes.songbook \
//   SONGBOOK_WITH_TUNES_PATH=/path/to/with_tunes.songbook \
//     pnpm --filter @songbook/book-model bench

import { existsSync, readFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { bench, describe } from 'vitest';
import {
  buildAudioIndex,
  decodeBookJson,
  decodeSongbookArchive,
  pageModels,
  pageIndexBySongId,
  resolveAudioFilenames,
  resolveAudioFilenamesFromIndex,
  search,
} from '../src/index.js';
import {
  bookToWireJson,
  buildSynthAudioFilenames,
  buildSynthBook,
} from './synth-book.js';

// Build the synthetic inputs ONCE outside the bench loop so the bench
// measures only the operation under test, not the fixture build.
const synthBook = buildSynthBook();
const synthWireJson = bookToWireJson(synthBook);
const synthArchiveBytes = zipSync({ 'book.json': strToU8(synthWireJson) });
const synthAudioFilenames = buildSynthAudioFilenames();
const synthPages = pageModels(synthBook);

// Real-archive overrides (optional, for local dev).
const NO_TUNES = process.env.SONGBOOK_NO_TUNES_PATH ?? '';
const WITH_TUNES = process.env.SONGBOOK_WITH_TUNES_PATH ?? '';
const noTunesBytes = NO_TUNES !== '' && existsSync(NO_TUNES) ? readFileSync(NO_TUNES) : null;
const withTunesBytes = WITH_TUNES !== '' && existsSync(WITH_TUNES) ? readFileSync(WITH_TUNES) : null;

describe('decode', () => {
  bench('decodeBookJson(synth 751 songs)', () => {
    decodeBookJson(synthWireJson);
  });

  bench('decodeSongbookArchive(synth zip)', () => {
    decodeSongbookArchive(synthArchiveBytes);
  });

  if (noTunesBytes !== null) {
    bench('decodeSongbookArchive(real no_tunes.songbook)', () => {
      decodeSongbookArchive(noTunesBytes);
    });
  }
  if (withTunesBytes !== null) {
    bench('decodeSongbookArchive(real with_tunes.songbook 261 MB)', () => {
      decodeSongbookArchive(withTunesBytes);
    });
  }
});

describe('page-model', () => {
  bench('pageModels(synth book)', () => {
    pageModels(synthBook);
  });

  bench('pageIndexBySongId(synth pages)', () => {
    pageIndexBySongId(synthPages);
  });
});

describe('search', () => {
  // Mix of patterns: common word with many hits, less-common word, miss,
  // numeric exact match, numeric partial match. Exercises both modes.
  bench('search "praise" (text, common word)', () => {
    search(synthBook, 'praise');
  });

  bench('search "shepherd" (text, less common)', () => {
    search(synthBook, 'shepherd');
  });

  bench('search "no_such_word_xyz" (text, miss)', () => {
    search(synthBook, 'no_such_word_xyz');
  });

  bench('search "242" (numeric, exact + partial)', () => {
    search(synthBook, '242');
  });

  bench('search "5" (numeric, many partial matches)', () => {
    search(synthBook, '5');
  });
});

describe('audio-resolver', () => {
  // Pre-build the index ONCE. Phase 1.4: this is the work moved from
  // every-swipe to every-import.
  const synthAudioIndex = buildAudioIndex(synthAudioFilenames);

  const songInSection0 = synthBook.sections[0]!.songs[0]!;
  const songInSection2 = synthBook.sections[2]!.songs[0]!;

  bench('resolveAudioFilenames legacy (section 0, song 0)', () => {
    resolveAudioFilenames(songInSection0, { sectionIndex: 0, songIndex: 0 }, synthAudioFilenames);
  });

  bench('resolveAudioFilenamesFromIndex (section 0, song 0)', () => {
    resolveAudioFilenamesFromIndex(songInSection0, { sectionIndex: 0, songIndex: 0 }, synthAudioIndex);
  });

  bench('resolveAudioFilenames legacy × 50 swipe simulation', () => {
    for (let i = 0; i < 50; i++) {
      const song = synthBook.sections[0]!.songs[i]!;
      resolveAudioFilenames(song, { sectionIndex: 0, songIndex: i }, synthAudioFilenames);
    }
  });

  bench('resolveAudioFilenamesFromIndex × 50 swipe simulation', () => {
    for (let i = 0; i < 50; i++) {
      const song = synthBook.sections[0]!.songs[i]!;
      resolveAudioFilenamesFromIndex(song, { sectionIndex: 0, songIndex: i }, synthAudioIndex);
    }
  });

  bench('buildAudioIndex (one-time import-side cost)', () => {
    buildAudioIndex(synthAudioFilenames);
  });
});
