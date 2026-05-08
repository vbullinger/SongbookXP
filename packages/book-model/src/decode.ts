import { unzipSync, strFromU8 } from 'fflate';
import { BookSchema } from './schema.js';
import type { Book } from './types.js';

export class BookDecodeError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BookDecodeError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/** Decode a `Book` from a JSON string. Throws `BookDecodeError` on failure. */
export function decodeBookJson(source: string): Book {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (err) {
    throw new BookDecodeError('book.json is not valid JSON', err);
  }

  const result = BookSchema.safeParse(parsed);
  if (!result.success) {
    throw new BookDecodeError(`book.json failed schema validation: ${result.error.message}`, result.error);
  }
  return result.data;
}

/**
 * Decode a `Book` and its audio-file listing from the raw bytes of a
 * `.songbook` archive. The archive is a zip containing `book.json` at the
 * root plus (optionally) sibling audio files. This function is pure-TS and
 * runs in any JS runtime; on-device the mobile app prefers native zip for
 * large archives, but the result shape is identical.
 */
export function decodeSongbookArchive(bytes: Uint8Array): { book: Book; audioFileNames: readonly string[] } {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (err) {
    throw new BookDecodeError('archive is not a valid zip', err);
  }

  const bookEntry = entries['book.json'];
  if (bookEntry == null) {
    throw new BookDecodeError('archive does not contain book.json at the root');
  }

  const book = decodeBookJson(strFromU8(bookEntry));

  const audioFileNames = Object.keys(entries)
    .filter((name) => name !== 'book.json' && name.toLowerCase().endsWith('.m4a'))
    .sort();

  return { book, audioFileNames };
}
