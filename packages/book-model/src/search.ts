// Substring search across a Book with title-weighted ranking, plus a
// numeric-only mode that hits song.number directly.
//
// Mode selection mirrors upstream Swift Index.swift:searchResults(for:):
//   - query contains any letters → text search across title/subtitle/text/author
//   - query contains only digits  → number search across song.number, with a
//     synthetic "Exact Matches" section prepended when exact and partial
//     matches both exist
//   - otherwise (empty / punctuation-only) → no results
//
// Tokenization for the text mode is deliberately simple — case-insensitive
// substring. For a 751-song corpus, more elaborate schemes (stemming, BM25,
// fuzzy) are overkill and cost more in behavior surprise than they buy in
// recall. If a future book grows meaningfully larger or richer, this is the
// one place to upgrade.

import { combinedTitle } from './combined-title.js';
import type { Book, Song, SongId } from './types.js';

export type MatchType =
  | 'exact-title'
  | 'title-prefix'
  | 'title'
  | 'subtitle'
  | 'text'
  | 'author'
  | 'number';

const EXACT_MATCHES_SECTION_INDEX = -1;

export interface SearchResult {
  readonly songId: SongId;
  readonly combinedTitle: string;
  readonly matchType: MatchType;
  readonly snippet: string | undefined;
  readonly score: number;
}

export interface SearchResultSection {
  readonly sectionIndex: number;
  readonly sectionTitle: string | undefined;
  readonly results: readonly SearchResult[];
}

const SNIPPET_CONTEXT = 24;

export function search(book: Book, query: string): readonly SearchResultSection[] {
  const q = query.trim();
  if (q === '') return [];

  const hasLetters = /\p{L}/u.test(q);
  const hasDigits = /\d/.test(q);

  if (hasLetters) return searchByText(book, q.toLowerCase());
  if (hasDigits) return searchByNumber(book, q.replace(/\D/g, ''));
  return [];
}

function searchByText(book: Book, q: string): readonly SearchResultSection[] {
  const sections: SearchResultSection[] = [];
  book.sections.forEach((section, sectionIndex) => {
    const results: SearchResult[] = [];
    section.songs.forEach((song, songIndex) => {
      const r = scoreSong(song, { sectionIndex, songIndex }, q);
      if (r !== null) results.push(r);
    });
    results.sort((a, b) => b.score - a.score);
    if (results.length > 0) {
      sections.push({ sectionIndex, sectionTitle: section.title, results });
    }
  });
  return sections;
}

function searchByNumber(book: Book, digits: string): readonly SearchResultSection[] {
  const sections: SearchResultSection[] = [];
  const exactMatches: SearchResult[] = [];
  let allMatchesExact = true;

  book.sections.forEach((section, sectionIndex) => {
    const results: SearchResult[] = [];
    section.songs.forEach((song, songIndex) => {
      if (song.number === undefined) return;
      const numStr = String(song.number);
      if (!numStr.includes(digits)) return;

      const isExact = numStr === digits;
      const r: SearchResult = {
        songId: { sectionIndex, songIndex },
        combinedTitle: combinedTitle(song),
        matchType: 'number',
        snippet: undefined,
        score: isExact ? 1000 : 100,
      };
      results.push(r);
      if (isExact) exactMatches.push(r);
      else allMatchesExact = false;
    });
    if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      sections.push({ sectionIndex, sectionTitle: section.title, results });
    }
  });

  // Mirror upstream: surface a synthetic "Exact Matches" section at the top
  // when exact and non-exact matches coexist. If every match is exact, the
  // grouped sections already make the answer obvious.
  if (exactMatches.length > 0 && !allMatchesExact) {
    sections.unshift({
      sectionIndex: EXACT_MATCHES_SECTION_INDEX,
      sectionTitle: 'Exact Matches',
      results: exactMatches,
    });
  }

  return sections;
}

function scoreSong(song: Song, songId: SongId, q: string): SearchResult | null {
  const title = (song.title ?? '').toLowerCase();

  // Title checks first — they outrank body matches regardless of order.
  if (title === q) {
    return result(song, songId, 'exact-title', undefined, 1000);
  }
  if (title.startsWith(q)) {
    return result(song, songId, 'title-prefix', undefined, 500);
  }
  if (title.includes(q)) {
    return result(song, songId, 'title', undefined, 300);
  }

  const subtitle = (song.subtitle ?? '').toLowerCase();
  if (subtitle.includes(q)) {
    return result(song, songId, 'subtitle', song.subtitle, 200);
  }

  // Verse text — return the first verse snippet containing the query.
  for (const verse of song.verses) {
    if (verse.text === undefined) continue;
    const hay = verse.text.toLowerCase();
    const at = hay.indexOf(q);
    if (at !== -1) {
      return result(song, songId, 'text', snippet(verse.text, at, q.length), 100);
    }
  }

  const author = (song.author ?? '').toLowerCase();
  if (author.includes(q)) {
    return result(song, songId, 'author', song.author, 50);
  }

  return null;
}

function result(
  song: Song,
  songId: SongId,
  matchType: MatchType,
  snippetText: string | undefined,
  score: number,
): SearchResult {
  return {
    songId,
    combinedTitle: combinedTitle(song),
    matchType,
    snippet: snippetText,
    score,
  };
}

function snippet(text: string, at: number, length: number): string {
  const start = Math.max(0, at - SNIPPET_CONTEXT);
  const end = Math.min(text.length, at + length + SNIPPET_CONTEXT);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return (prefix + text.slice(start, end) + suffix).replace(/\s+/g, ' ').trim();
}
