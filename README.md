# Songbook XP

A cross-platform mobile viewer for `.songbook` archives — single-book at a
time, with page-flip navigation, search by title or number, audio playback
with lock-screen transport controls, an accessibility font picker, and full
offline operation.

A React Native + Expo port of [paulhimes/songbook](https://github.com/paulhimes/songbook)
(iOS-only Swift), aiming for behavioral and visual parity on iOS while
extending to Android.

## What it does

- **Page-flip viewer** for songs and lyrics, with verse / chorus layout
  faithful to the upstream Swift app.
- **Search** by title (full-text across song titles and verses) or by
  song number.
- **Audio playback** of one or more takes per song, with lock-screen
  controls (play / pause / scrub) on iOS and Android.
- **Accessibility** font picker — APHont and Atkinson Hyperlegible, two
  typefaces designed for readers with low vision.
- **Offline-first** — no network access required at runtime.
- **iOS Guided Access** support: phantom Play commands suppressed during
  GA activation.

## Tech stack

- Expo SDK 55, React 19.2, React Native 0.83
- Zustand for app state, vitest for the pure model package, jest for the
  mobile app
- EAS Build for iOS + Android distribution
- pnpm workspaces

## Repository layout

```
apps/
  mobile/           Expo React Native app (iOS + Android)
packages/
  book-model/       Pure-TS domain model, parser, search index
patches/            pnpm patches against upstream packages
```

## Building from source (macOS)

Prerequisites:

- Node ≥ 20, pnpm ≥ 10
- For iOS device builds: Xcode 16+ and an Apple Developer account
- For Android device builds: Android Studio with SDK Platform 36 and
  NDK 27.1; or an EAS Build subscription

```sh
pnpm install
pnpm -r typecheck
pnpm -r test
```

Mobile dev cycle:

```sh
cd apps/mobile
pnpm start                                # Metro for a dev-client build
eas build --profile development --platform ios       # first-time iOS APK
eas build --profile development --platform android   # first-time Android APK
```

The `book-model` package is platform-free Node code and runs anywhere:

```sh
cd packages/book-model
pnpm test:watch
pnpm bench                                # vitest bench harness
```

## `.songbook` file format

A `.songbook` file is a zip archive. Build your own by zipping a
`book.json` plus optional sibling `.m4a` audio files at the root.

```
your-book.songbook (zip)
├── book.json                   required, at the root
├── 0-0.m4a                     optional audio: section 0, song 0
├── 0-1-0.m4a                   optional audio: section 0, song 1, take 0
├── 0-1-1.m4a                                        … take 1
└── ...
```

`book.json` shape:

```jsonc
{
  "bookTitle":    "My Songs",       // required
  "version":      1,                // required, integer
  "contactEmail": "...",            // optional
  "updateURL":    "...",            // optional
  "sections": [{
    "sectionTitle": "Section A",    // optional
    "songs": [{
      "songNumber":     1,
      "songTitle":      "Song Title",
      "songSubtitle":   "Subtitle",
      "songAuthor":     "Author Name",
      "songYear":       "1873",
      "audioFileNames": ["..."],    // optional: explicit ordered list, overrides auto-discovery
      "relatedSongs": [
        { "relatedSongSectionIndex": 0, "relatedSongIndex": 2 }
      ],
      "verses": [{
        "verseTitle":      "...",
        "verseNumber":     1,
        "verseText":       "...",
        "verseIsChorus":   0,       // 0 = verse, > 0 = chorus
        "verseChorusIndex": 0,      // where to insert this chorus into verse flow
        "verseRepeatText": "..."    // shown after the verse
      }]
    }]
  }]
}
```

**Audio file naming** when not specified explicitly via `audioFileNames`:

- `<sectionIndex>-<songIndex>.m4a` — single take
- `<sectionIndex>-<songIndex>-<takeIndex>.m4a` — multiple takes

Indices are zero-based. Takes play in lexical sort order.

Field names mirror the upstream Swift app's Core Data model so archives
work in both apps without modification.

## Acknowledgments

[paulhimes/songbook](https://github.com/paulhimes/songbook) — the original
iOS Swift app this is a port of. Visual identity and `.songbook` format
match upstream so archives are interchangeable.

## License

[The Unlicense](LICENSE) — public domain dedication, matching the upstream
Swift app. Free to copy, modify, publish, distribute, sell, or use for any
purpose, with no attribution required.
