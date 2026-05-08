import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import { AudioController } from './src/components/AudioController';
import { BookPager } from './src/components/BookPager';
import { FontPickerSheet } from './src/components/FontPickerSheet';
import { SearchScreen } from './src/components/SearchScreen';
import { loadDemoBook } from './src/load-demo-book';
import { importSongbookFromUri } from './src/import/import-songbook';
import { perfMark } from './src/perf/perf-marks';
import { useBookStore } from './src/store/book-store';
import { useFontModePreference } from './src/store/preferences-store';
import { colors } from './src/theme';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner(): React.JSX.Element {
  const [fontsLoaded, fontError] = useFonts({
    'APHont-Regular': require('./assets/fonts/APHont-Regular.ttf'),
    'APHont-Bold': require('./assets/fonts/APHont-Bold.ttf'),
    'AtkinsonHyperlegible-Regular': require('./assets/fonts/AtkinsonHyperlegible-Regular.otf'),
    'AtkinsonHyperlegible-Bold': require('./assets/fonts/AtkinsonHyperlegible-Bold.otf'),
  });

  const setBook = useBookStore((s) => s.setBook);
  const setLoadError = useBookStore((s) => s.setLoadError);
  const loadError = useBookStore((s) => s.loadError);
  const book = useBookStore((s) => s.book);
  const songByKey = useBookStore((s) => s.songByKey);
  const audioDirectoryUri = useBookStore((s) => s.audioDirectoryUri);
  const searchOpen = useBookStore((s) => s.searchOpen);

  const [fontMode, setFontMode] = useFontModePreference();
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  // Bootstrap: load the bundled demo book on first launch. When a real
  // .songbook arrives via OS "Open with", it replaces the demo.
  useEffect(() => {
    try {
      const { book, songByKey } = perfMark('loadDemoBook', () => loadDemoBook());
      setBook({ book, songByKey });
    } catch (err) {
      setLoadError(String(err));
    }
  }, [setBook, setLoadError]);

  // Listen for .songbook URIs delivered by the OS. Handles both cold-
  // start (app launched by the tap) and warm (app already running).
  useEffect(() => {
    let cancelled = false;

    const handleUri = (uri: string | null) => {
      if (cancelled || uri === null) return;
      // Android delivers content:// URIs whose string form is a document
      // ID, not the filename — so we can't filter by extension. Filter by
      // scheme instead: only file:// (iOS) and content:// (Android) point
      // at actual file bytes. The OS-level intent filters / UTI declarations
      // already restrict which files reach this listener.
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) return;
      setLoadError(null);
      importSongbookFromUri(uri)
        .then((result) => {
          if (cancelled) return;
          setBook({
            book: result.book,
            songByKey: result.songByKey,
            audioDirectoryUri: result.audioDirectoryUri,
            audioFilenames: result.audioFilenames,
            audioIndex: result.audioIndex,
            bookArchiveUri: result.bookArchiveUri,
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(`Failed to import songbook: ${String(err)}`);
        });
    };

    void Linking.getInitialURL().then(handleUri);
    const sub = Linking.addEventListener('url', ({ url }) => handleUri(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [setBook, setLoadError]);

  if (fontError) {
    return (
      <Shell>
        <Text style={styles.errorText}>Font load error: {String(fontError)}</Text>
      </Shell>
    );
  }

  if (!fontsLoaded) {
    return (
      <Shell>
        <ActivityIndicator color={colors.accent} />
      </Shell>
    );
  }

  if (loadError !== null) {
    return (
      <Shell>
        <Text style={styles.errorText}>{loadError}</Text>
      </Shell>
    );
  }

  if (book === null) {
    return (
      <Shell>
        <ActivityIndicator color={colors.accent} />
      </Shell>
    );
  }

  return (
    <SafeAreaView style={styles.chrome}>
      <StatusBar style="dark" />
      <View style={styles.flex}>
        <BookPager
          songByKey={songByKey}
          fontMode={fontMode}
          onOpenFontPicker={() => setFontPickerOpen(true)}
        />
        <AudioController songByKey={songByKey} audioDirectoryUri={audioDirectoryUri} />
      </View>
      {searchOpen && (
        <View style={StyleSheet.absoluteFill}>
          <SearchScreen book={book} />
        </View>
      )}
      <FontPickerSheet
        visible={fontPickerOpen}
        current={fontMode}
        onSelect={setFontMode}
        onClose={() => setFontPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.chrome}>
      <View style={styles.centered}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chrome: { flex: 1, backgroundColor: colors.pageBackground },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.accent, padding: 24, textAlign: 'center' },
});
