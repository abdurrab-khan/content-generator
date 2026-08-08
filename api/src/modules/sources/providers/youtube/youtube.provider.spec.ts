import { describe, expect, it } from 'vitest';
import { YoutubeProvider } from './youtube.provider.js';

// supports() is pure URL matching — no yt-dlp needed.
const provider = new YoutubeProvider(null as never);

describe('YoutubeProvider.supports', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/abc123',
    'https://www.youtube.com/live/abc123',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  ])('accepts %s', (url) => {
    expect(provider.supports(url)).toBe(true);
  });

  it.each([
    'https://twitch.tv/videos/123',
    'https://vimeo.com/123',
    'not-a-url',
    'https://youtube.com.evil.com/watch?v=x',
  ])('rejects %s', (url) => {
    expect(provider.supports(url)).toBe(false);
  });
});
