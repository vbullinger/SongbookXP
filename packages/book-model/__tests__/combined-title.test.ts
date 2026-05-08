// Ported from Swift-Rewrite's BookModelTests/SongTests.swift.
import { describe, expect, it } from 'vitest';
import { combinedTitle } from '../src/combined-title.js';

describe('combinedTitle', () => {
  it('returns "Untitled Song" when both number and title are missing', () => {
    expect(combinedTitle({ number: undefined, title: undefined })).toBe('Untitled Song');
  });

  it('prepends the number when title is missing', () => {
    expect(combinedTitle({ number: 1, title: undefined })).toBe('1: Untitled Song');
  });

  it('returns the title alone when number is missing', () => {
    expect(combinedTitle({ number: undefined, title: 'Title' })).toBe('Title');
  });

  it('combines number and title when both are present', () => {
    expect(combinedTitle({ number: 1, title: 'Title' })).toBe('1: Title');
  });
});
