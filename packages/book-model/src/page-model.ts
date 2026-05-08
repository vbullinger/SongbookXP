import { combinedTitle } from './combined-title.js';
import { fullText } from './full-text.js';
import type { Book, PageModel } from './types.js';

/**
 * Flatten a `Book` into the linear sequence of pages shown by the pager UI.
 * Order: the book cover, then for each section: its title page followed by
 * its songs. The cover is always first; sections and songs follow their
 * positional indices.
 */
export function pageModels(book: Book): readonly PageModel[] {
  const pages: PageModel[] = [
    { kind: 'book', title: book.title, version: book.version },
  ];

  book.sections.forEach((section, sectionIndex) => {
    pages.push({ kind: 'section', title: section.title, sectionIndex });
    section.songs.forEach((song, songIndex) => {
      pages.push({
        kind: 'song',
        songId: { sectionIndex, songIndex },
        combinedTitle: combinedTitle(song),
        text: fullText(song),
      });
    });
  });

  return pages;
}
