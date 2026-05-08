// Theme tokens — single source of truth for colors, font families and spacing.
// Cross-platform identical; no platform-specific branching here. Font family
// names match the names we register with expo-font in App.tsx.

export const colors = {
  background: '#fafaf8',
  ink: '#1a1a1a',
  inkMuted: '#555',
  inkFaint: '#888',
  accent: '#bd1931',
  accentDark: '#7d1020',
  rule: '#e4e4e4',
  pageBackground: '#ffffff',
} as const;

export type FontMode = 'aphont' | 'atkinson';

export const FONT_MODES: readonly FontMode[] = ['aphont', 'atkinson'];

export interface FontFamily {
  readonly body: string;
  readonly bodyBold: string;
  readonly label: string;
}

const FONT_FAMILIES: Record<FontMode, FontFamily> = {
  aphont: { body: 'APHont-Regular', bodyBold: 'APHont-Bold', label: 'APHont' },
  atkinson: {
    body: 'AtkinsonHyperlegible-Regular',
    bodyBold: 'AtkinsonHyperlegible-Bold',
    label: 'Atkinson Hyperlegible',
  },
};

export function fontFamilyFor(mode: FontMode): FontFamily {
  return FONT_FAMILIES[mode];
}

// Legacy `fonts` kept for components that do not yet observe the font-mode
// setting. Currently used by SearchScreen / NowPlayingBar — those surfaces
// are intentionally fixed to APHont for UI chrome consistency.
export const fonts = {
  body: 'APHont-Regular',
  bodyBold: 'APHont-Bold',
  altBody: 'AtkinsonHyperlegible-Regular',
  altBodyBold: 'AtkinsonHyperlegible-Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSizes = {
  title: 28,
  subtitle: 18,
  verseTitle: 16,
  verseBody: 17,
  meta: 13,
} as const;
