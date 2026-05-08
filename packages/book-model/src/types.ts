// Domain types consumed by application code.
// Names are cleaner than the wire format used inside `.songbook` files — see
// `schema.ts` for the wire-to-domain transform. Do not rename these fields
// without also updating the transform.

export interface Book {
  readonly title: string;
  readonly contactEmail: string | undefined;
  readonly updateURL: string | undefined;
  readonly version: number;
  readonly sections: readonly Section[];
}

export interface Section {
  readonly title: string | undefined;
  readonly songs: readonly Song[];
}

export interface Song {
  readonly number: number | undefined;
  readonly title: string | undefined;
  readonly subtitle: string | undefined;
  readonly author: string | undefined;
  readonly year: string | undefined;
  readonly audioFileNames: readonly string[] | undefined;
  readonly relatedSongs: readonly RelatedSong[] | undefined;
  readonly verses: readonly Verse[];
}

export interface Verse {
  readonly title: string | undefined;
  readonly number: number | undefined;
  readonly text: string | undefined;
  // Kept as the raw int for lossless encode; `isChorus` is the usable boolean.
  readonly isChorusInt: number | undefined;
  readonly isChorus: boolean;
  readonly chorusIndex: number | undefined;
  readonly repeatText: string | undefined;
}

export interface RelatedSong {
  readonly sectionIndex: number;
  readonly songIndex: number;
}

// Book-scoped positional identifier for a Song.
export interface SongId {
  readonly sectionIndex: number;
  readonly songIndex: number;
}

// Book-scoped positional identifier for a single playable audio file belonging
// to a Song. `playableItemIndex` is 0 for a single-take song or 0..N-1 across
// the takes when a song has multiple audio files.
export interface PlayableItemId {
  readonly sectionIndex: number;
  readonly songIndex: number;
  readonly playableItemIndex: number;
}

export interface PlayableItem {
  readonly id: PlayableItemId;
  readonly songId: SongId;
  readonly title: string | undefined;
  readonly author: string | undefined;
  readonly audioFileName: string;
}

// Flat page list used by the book pager UI.
export type PageModel =
  | { readonly kind: 'book'; readonly title: string; readonly version: number }
  | { readonly kind: 'section'; readonly title: string | undefined; readonly sectionIndex: number }
  | { readonly kind: 'song'; readonly songId: SongId; readonly combinedTitle: string; readonly text: string };
