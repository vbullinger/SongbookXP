// Imports a `.songbook` file received via OS "Open with" into the app's
// private book directory. Strategy mirrors Swift-Rewrite's BookModel.importBookWithFallback:
//
//   1. Remove the existing book directory if present.
//   2. Unzip the incoming archive into a fresh book directory.
//   3. Decode book.json into a Book.
//   4. Enumerate sibling files for the audio directory listing.
//   5. Update the store with the new book, its song lookup, and the
//      audio directory URI for the audio resolver.
//
// The incoming URI arrives via expo-linking and can be either `file://`
// (iOS) or `content://` (Android). We copy it to an app-sandbox path
// before unzipping, both so Android's content provider does not revoke
// access mid-unzip and so the original caller-side resource is untouched.

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync, deleteAsync } from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { copySecureFile } from 'expo-ios-secure-copy';
import { buildAudioIndex, decodeBookJson } from '@songbook/book-model';
import type { AudioIndex, Book, Song } from '@songbook/book-model';
import { perfMark, perfMarkAsync } from '../perf/perf-marks';

const BOOK_DIR_NAME = 'book';
const STAGING_FILE_NAME = 'incoming.songbook';

export interface ImportResult {
  readonly book: Book;
  readonly songByKey: ReadonlyMap<string, Song>;
  readonly audioDirectoryUri: string;
  readonly audioFilenames: readonly string[];
  readonly audioIndex: AudioIndex;
  readonly bookArchiveUri: string;
}

export async function importSongbookFromUri(incomingUri: string): Promise<ImportResult> {
  const docs = new Directory(Paths.document);
  const bookDir = new Directory(docs, BOOK_DIR_NAME);
  const stagingFile = new File(docs, STAGING_FILE_NAME);

  // Clean slate. The new expo-file-system Directory.delete() is flaky on
  // Android when the directory has contents (or stale handles from a
  // previous run); the legacy deleteAsync with `idempotent` is robust
  // and also no-ops cleanly when the path doesn't exist. If something
  // inside the previous book directory is still held (most commonly an
  // open audio file from the previous session), purgeBookDirectory
  // surfaces a clear, actionable error instead of a generic IOException.
  await perfMarkAsync('import.purgePreviousBook', () => purgeBookDirectory(bookDir));
  await deleteAsync(stagingFile.uri, { idempotent: true });

  // Copy the incoming file into app-private storage.
  //
  // Android: the URI is usually `content://…` whose access the OS may
  // revoke. expo-file-system's new File API rejects content:// URIs, so
  // we use legacy `copyAsync`, which routes through ContentResolver.
  //
  // iOS: the URI may be a security-scoped `file://` from Files.app →
  // iCloud Drive or a third-party DocumentProvider. expo-file-system's
  // copyAsync does not claim security-scoped access on those and fails
  // with "File … is not readable." Route through the native
  // ExpoIosSecureCopy module, which wraps NSFileCoordinator and
  // startAccessingSecurityScopedResource(). The native path also
  // materializes iCloud placeholders before reading.
  await perfMarkAsync('import.copyAsync', () =>
    Platform.OS === 'ios'
      ? copySecureFile(incomingUri, stagingFile.uri)
      : copyAsync({ from: incomingUri, to: stagingFile.uri }),
  );

  // Create the fresh book directory and unzip into it.
  bookDir.create({ intermediates: true });
  await perfMarkAsync('import.unzip', () =>
    unzip(stripFileScheme(stagingFile.uri), stripFileScheme(bookDir.uri)),
  );

  // Read book.json.
  const bookJson = new File(bookDir, 'book.json');
  if (!bookJson.exists) {
    throw new Error('Imported archive does not contain book.json at the root');
  }
  const bookJsonText = await perfMarkAsync('import.readBookJson', () => bookJson.text());
  const book = perfMark('import.decodeBookJson', () => decodeBookJson(bookJsonText));

  // Enumerate audio files. Names are used verbatim by the audio
  // resolver; we just need the flat list alongside book.json.
  const entries = perfMark('import.listBookDir', () => bookDir.list());
  // entries is an array of File/Directory objects; narrow to files.
  const audioFiles = entries.filter((e): e is File => e instanceof File && e.name !== 'book.json');

  // Keep the original archive around for share-out — if it has audio,
  // we hand out the full archive; otherwise callers can regenerate a
  // text-only archive from book.json on demand.
  const preserveArchive = new File(docs, audioFiles.length > 0 ? 'book-with-tunes.songbook' : 'book-without-tunes.songbook');
  await deleteAsync(preserveArchive.uri, { idempotent: true });
  await stagingFile.copy(preserveArchive);
  await deleteAsync(stagingFile.uri, { idempotent: true });

  const audioFilenames = audioFiles.map((f) => f.name);
  return {
    book,
    songByKey: perfMark('import.indexSongs', () => indexSongs(book)),
    audioDirectoryUri: bookDir.uri,
    audioFilenames,
    audioIndex: perfMark('import.buildAudioIndex', () => buildAudioIndex(audioFilenames)),
    bookArchiveUri: preserveArchive.uri,
  };
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

// react-native-zip-archive expects plain filesystem paths, not URIs.
// expo-file-system returns `file://` URIs; we strip the scheme.
function stripFileScheme(uri: string): string {
  if (uri.startsWith('file://')) return decodeURIComponent(uri.slice('file://'.length));
  return uri;
}

// Best-effort recursive delete with a useful failure message. Tries the
// fast path first; if that fails (Android typically when one entry inside
// is held by another process), enumerates and deletes children one at a
// time, then retries the directory itself. Throws with a recovery hint if
// the directory still won't go away after that.
async function purgeBookDirectory(dir: Directory): Promise<void> {
  try {
    await deleteAsync(dir.uri, { idempotent: true });
    return;
  } catch {
    // Fall through to per-entry cleanup.
  }

  if (dir.exists) {
    for (const entry of dir.list()) {
      try {
        await deleteAsync(entry.uri, { idempotent: true });
      } catch {
        // Skip locked entries — we'll surface the directory-level error
        // below if anything remains.
      }
    }
  }

  try {
    await deleteAsync(dir.uri, { idempotent: true });
  } catch (err) {
    throw new Error(
      `Could not reset previous book at ${dir.uri}. ` +
        `On Android, clear the app's storage (Settings → Apps → Songbook → ` +
        `Storage → Clear data) and re-import. Underlying error: ${String(err)}`,
    );
  }
}
