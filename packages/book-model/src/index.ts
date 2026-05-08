export const BOOK_MODEL_VERSION = '0.0.0';

export type {
  Book,
  Section,
  Song,
  Verse,
  RelatedSong,
  SongId,
  PlayableItemId,
  PlayableItem,
  PageModel,
} from './types.js';

export { BookSchema } from './schema.js';
export { decodeBookJson, decodeSongbookArchive, BookDecodeError } from './decode.js';
export { combinedTitle } from './combined-title.js';
export { fullText } from './full-text.js';
export { pageModels } from './page-model.js';
export {
  resolveAudio,
  resolveAudioFilenames,
  resolveAudioFromIndex,
  resolveAudioFilenamesFromIndex,
  buildAudioIndex,
  type AudioIndex,
} from './audio-resolver.js';
export { search } from './search.js';
export type { SearchResult, SearchResultSection, MatchType } from './search.js';
export { pageIndexBySongId, keyOf } from './page-index.js';
