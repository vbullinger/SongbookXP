// A self-contained demo song used by App.tsx to exercise the renderer at
// M3 before a real book is loaded. Hand-written synthetic content so it
// covers every branch of SongPageView:
//   - Combined title with number
//   - Subtitle
//   - Verse title
//   - Numbered verse
//   - Chorus verse (with "Chorus: " prefix)
//   - Verse with chorusIndex (appends " Chorus")
//   - Verse with repeatText
//   - Author and year meta
//
// Replaced with real book pages in M4.

import type { Song } from '@songbook/book-model';

export const demoSong: Song = {
  number: 42,
  title: 'A Study in Page Rendering',
  subtitle: 'Exercises every branch of SongPageView',
  author: 'Test Author',
  year: '2026',
  audioFileNames: undefined,
  relatedSongs: undefined,
  verses: [
    {
      title: 'Opening',
      number: 1,
      text: 'This is the opening verse. It has a number prefix.',
      isChorusInt: undefined,
      isChorus: false,
      chorusIndex: 0,
      repeatText: undefined,
    },
    {
      title: undefined,
      number: undefined,
      text: 'And now the chorus, prefixed with “Chorus:”.',
      isChorusInt: 1,
      isChorus: true,
      chorusIndex: undefined,
      repeatText: undefined,
    },
    {
      title: undefined,
      number: 2,
      text: 'A second numbered verse with a repeat fragment.',
      isChorusInt: undefined,
      isChorus: false,
      chorusIndex: undefined,
      repeatText: 'repeat fragment.',
    },
  ],
};
