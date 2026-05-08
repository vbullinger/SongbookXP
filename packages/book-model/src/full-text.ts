import { combinedTitle } from './combined-title.js';
import type { Song } from './types.js';

/**
 * Concatenate a song into a single display/search string. Ports
 * Swift-Rewrite's `Song.fullText` line-for-line. Layout:
 *
 *   {combinedTitle}
 *   {subtitle}?
 *
 *   {verse.title}?
 *   {versePrefix}{verse.text}? [ Chorus]?
 *   ...
 *
 *   {author}?
 *   {year}?
 *
 * versePrefix is "Chorus: " when the verse is a chorus, otherwise
 * "{verse.number}: " when a number is present, otherwise empty.
 * " Chorus" is appended when the verse carries a `chorusIndex`.
 */
export function fullText(song: Song): string {
  let out = combinedTitle(song) + '\n';

  if (song.subtitle !== undefined) {
    out += song.subtitle + '\n';
  }

  for (const verse of song.verses) {
    if (verse.title !== undefined) {
      out += '\n' + verse.title;
    }

    let versePrefix = '';
    if (verse.isChorus) {
      versePrefix = 'Chorus: ';
    } else if (verse.number !== undefined) {
      versePrefix = `${verse.number}: `;
    }
    const verseBody = verse.text ?? '';
    out += '\n' + versePrefix + verseBody;

    if (verse.chorusIndex !== undefined) {
      out += ' Chorus';
    }

    out += '\n';
  }

  if (song.author !== undefined) {
    out += '\n' + song.author;
  }

  if (song.year !== undefined) {
    out += '\n' + song.year;
  }

  return out;
}
