import type { PlayableItem, Song, SongId } from './types.js';

const SUPPORTED_AUDIO_EXTENSIONS = ['m4a', 'mp3', 'wav', 'caf'] as const;

/**
 * Produce the ordered list of playable audio files for a given song.
 *
 * Resolution rules, in order:
 *   1. If `song.audioFileNames` is a non-null array, return those names
 *      verbatim (the book author declared this set; no fallback, no
 *      filtering by existence).
 *   2. Otherwise, pick files in `availableFiles` whose stem (filename
 *      without one of the supported audio extensions) is either exactly
 *      `{sectionIndex}-{songIndex}` (single-take) or starts with
 *      `{sectionIndex}-{songIndex}-` (multi-take). Sort the matches
 *      lexically. This mirrors the upstream Swift `Index.swift` exactly:
 *
 *        let indexedFileName = "\(sectionIndex)-\(songIndex)"
 *        audioFiles.keys.filter {
 *          $0 == indexedFileName || $0.hasPrefix("\(indexedFileName)-")
 *        }.sorted()
 *
 *   3. Otherwise return an empty array.
 *
 * IMPORTANT: the convention uses the song's 0-based `songIndex` (its
 * position in `section.songs`), NOT the `song.number` metadata field.
 * The two often differ — e.g. a section that opens with a non-numbered
 * preface song followed by `songNumber: 1` would mismatch under any
 * convention keyed on `song.number`.
 */
export function resolveAudio(
  song: Song,
  songId: SongId,
  availableFiles: Iterable<string>,
): readonly PlayableItem[] {
  const filenames = resolveAudioFilenames(song, songId, availableFiles);
  return filenames.map(
    (audioFileName, playableItemIndex): PlayableItem => ({
      id: { ...songId, playableItemIndex },
      songId,
      title: song.title,
      author: song.author,
      audioFileName,
    }),
  );
}

/** Same resolution logic but returning only the ordered filenames. */
export function resolveAudioFilenames(
  song: Song,
  songId: SongId,
  availableFiles: Iterable<string>,
): readonly string[] {
  if (song.audioFileNames !== undefined) {
    return [...song.audioFileNames];
  }

  const base = `${songId.sectionIndex}-${songId.songIndex}`;
  const prefix = `${base}-`;

  const matches: string[] = [];
  for (const name of availableFiles) {
    const stem = stripSupportedAudioExtension(name);
    if (stem === null) continue;
    if (stem === base || stem.startsWith(prefix)) {
      matches.push(name);
    }
  }
  return matches.sort();
}

function stripSupportedAudioExtension(name: string): string | null {
  for (const ext of SUPPORTED_AUDIO_EXTENSIONS) {
    const suffix = `.${ext}`;
    if (name.endsWith(suffix)) return name.slice(0, -suffix.length);
  }
  return null;
}

/**
 * Pre-built lookup keyed on `${sectionIndex}-${songIndex}`. Each value is
 * the lexically-sorted ordered filename array for that song. Phase 1.4
 * of the perf overhaul: built once at import time so per-song-change
 * resolution is O(takes per song) rather than O(total available files).
 */
export type AudioIndex = ReadonlyMap<string, readonly string[]>;

/**
 * Build the lookup from a flat list of available filenames in a single
 * pass. Result preserves the same ordered output that
 * `resolveAudioFilenames` would have returned for any given (sectionIndex,
 * songIndex) pair, so the two functions are interchangeable from a
 * caller's perspective.
 */
export function buildAudioIndex(availableFiles: Iterable<string>): AudioIndex {
  const m = new Map<string, string[]>();
  for (const name of availableFiles) {
    const stem = stripSupportedAudioExtension(name);
    if (stem === null) continue;
    // Stem is either `S-I` (single-take) or `S-I-T` (take T of song I).
    // Extract the `S-I` prefix in either case.
    const firstHyphen = stem.indexOf('-');
    if (firstHyphen < 0) continue;
    const secondHyphen = stem.indexOf('-', firstHyphen + 1);
    const key = secondHyphen < 0 ? stem : stem.slice(0, secondHyphen);
    let arr = m.get(key);
    if (arr === undefined) {
      arr = [];
      m.set(key, arr);
    }
    arr.push(name);
  }
  // Lock the order: phase 0.2's lock-in tests assert lexical sort.
  for (const arr of m.values()) arr.sort();
  return m;
}

/**
 * Drop-in replacement for `resolveAudio` that uses a pre-built index.
 * Same return shape as `resolveAudio`, same explicit-list-precedence
 * behavior.
 */
export function resolveAudioFromIndex(
  song: Song,
  songId: SongId,
  audioIndex: AudioIndex,
): readonly PlayableItem[] {
  const filenames = resolveAudioFilenamesFromIndex(song, songId, audioIndex);
  return filenames.map(
    (audioFileName, playableItemIndex): PlayableItem => ({
      id: { ...songId, playableItemIndex },
      songId,
      title: song.title,
      author: song.author,
      audioFileName,
    }),
  );
}

/** Same logic but returning only the ordered filenames. */
export function resolveAudioFilenamesFromIndex(
  song: Song,
  songId: SongId,
  audioIndex: AudioIndex,
): readonly string[] {
  if (song.audioFileNames !== undefined) {
    return [...song.audioFileNames];
  }
  const key = `${songId.sectionIndex}-${songId.songIndex}`;
  const matches = audioIndex.get(key);
  // Return a fresh array every call so callers can mutate without
  // tampering with the cached order in the index. Same reference-
  // identity contract as the legacy resolver.
  return matches === undefined ? [] : matches.slice();
}
