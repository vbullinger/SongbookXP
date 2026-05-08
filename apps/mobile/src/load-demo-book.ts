// Loads the bundled public-domain demo book. Same bundle path the real app
// will use during first launch and for App Store / Play Store review. Real
// book import via OS "Open with" lands in M8 and uses expo-file-system.
//
// JSON is imported directly — Metro bundles it as a JS module, so no
// filesystem access is needed for this small fixed asset.

import demoBookJson from '../assets/demo-book.json';
import { BookSchema } from '@songbook/book-model';
import type { Book, Song } from '@songbook/book-model';

export function loadDemoBook(): { book: Book; songByKey: ReadonlyMap<string, Song> } {
  const book = BookSchema.parse(demoBookJson);
  return { book, songByKey: indexSongs(book) };
}

function indexSongs(book: Book): Map<string, Song> {
  const m = new Map<string, Song>();
  book.sections.forEach((section, sectionIndex) => {
    section.songs.forEach((song, songIndex) => {
      m.set(`${sectionIndex}-${songIndex}`, song);
    });
  });
  return m;
}
