// Zod schemas for the `.songbook` wire format.
//
// The wire format uses the field names from Paul Himes' original Core Data
// model (bookTitle, songTitle, verseIsChorus, ...). The transforms in this
// file rename those to the cleaner domain names declared in `types.ts`.
//
// Why transform inline rather than expose the raw shape: downstream code
// should never see wire-format names. One place to update when the format
// evolves.

import { z } from 'zod';
import type { Book, RelatedSong, Section, Song, Verse } from './types.js';

const RelatedSongSchema = z
  .object({
    relatedSongSectionIndex: z.number().int(),
    relatedSongIndex: z.number().int(),
  })
  .transform(
    (r): RelatedSong => ({
      sectionIndex: r.relatedSongSectionIndex,
      songIndex: r.relatedSongIndex,
    }),
  );

const VerseSchema = z
  .object({
    verseTitle: z.string().optional(),
    verseNumber: z.number().int().optional(),
    verseText: z.string().optional(),
    verseIsChorus: z.number().int().optional(),
    verseChorusIndex: z.number().int().optional(),
    verseRepeatText: z.string().optional(),
  })
  .transform(
    (v): Verse => ({
      title: v.verseTitle,
      number: v.verseNumber,
      text: v.verseText,
      isChorusInt: v.verseIsChorus,
      // Matches Swift's `isChorusInt ?? 0 > 0`.
      isChorus: (v.verseIsChorus ?? 0) > 0,
      chorusIndex: v.verseChorusIndex,
      repeatText: v.verseRepeatText,
    }),
  );

const SongSchema = z
  .object({
    songNumber: z.number().int().optional(),
    songTitle: z.string().optional(),
    songSubtitle: z.string().optional(),
    songAuthor: z.string().optional(),
    songYear: z.string().optional(),
    audioFileNames: z.array(z.string()).optional(),
    relatedSongs: z.array(RelatedSongSchema).optional(),
    verses: z.array(VerseSchema),
  })
  .transform(
    (s): Song => ({
      number: s.songNumber,
      title: s.songTitle,
      subtitle: s.songSubtitle,
      author: s.songAuthor,
      year: s.songYear,
      audioFileNames: s.audioFileNames,
      relatedSongs: s.relatedSongs,
      verses: s.verses,
    }),
  );

const SectionSchema = z
  .object({
    sectionTitle: z.string().optional(),
    songs: z.array(SongSchema),
  })
  .transform(
    (s): Section => ({
      title: s.sectionTitle,
      songs: s.songs,
    }),
  );

export const BookSchema = z
  .object({
    bookTitle: z.string(),
    contactEmail: z.string().optional(),
    updateURL: z.string().optional(),
    version: z.number().int(),
    sections: z.array(SectionSchema),
  })
  .transform(
    (b): Book => ({
      title: b.bookTitle,
      contactEmail: b.contactEmail,
      updateURL: b.updateURL,
      version: b.version,
      sections: b.sections,
    }),
  );
