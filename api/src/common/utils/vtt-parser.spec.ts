import { describe, expect, it } from 'vitest';
import { parseVtt } from './vtt-parser.js';

const SAMPLE = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.500
Hello and welcome back

00:00:02.500 --> 00:00:05.000
to the <c>show</c> &amp; friends

00:00:05.000 --> 00:00:07.000
to the show & friends

00:00:07.000 --> 00:00:09.000
Today we discuss money
`;

const KARAOKE_SAMPLE = `WEBVTT

00:00:10.000 --> 00:00:12.000
<00:00:10.200><c>This</c> <00:00:10.500><c>is</c> <00:00:11.000><c>karaoke</c>

00:00:12.000 --> 00:00:14.000
Clean line
`;

describe('parseVtt', () => {
  it('parses cues with seconds and text', () => {
    const cues = parseVtt(SAMPLE);
    expect(cues[0]).toEqual({
      startSeconds: 0,
      endSeconds: 2.5,
      text: 'Hello and welcome back',
    });
    expect(cues[1]).toEqual({
      startSeconds: 2.5,
      endSeconds: 5,
      text: 'to the show & friends',
    });
  });

  it('collapses consecutive duplicate texts (auto-sub rolling artifact)', () => {
    const cues = parseVtt(SAMPLE);
    const texts = cues.map((cue) => cue.text);
    expect(
      texts.filter((text) => text === 'to the show & friends'),
    ).toHaveLength(1);
  });

  it('strips karaoke timestamps and tags', () => {
    const cues = parseVtt(KARAOKE_SAMPLE);
    expect(cues[0].text).toBe('This is karaoke');
    expect(cues[1].text).toBe('Clean line');
  });

  it('returns empty array for empty/invalid input', () => {
    expect(parseVtt('')).toEqual([]);
    expect(parseVtt('WEBVTT\n\nno timings here')).toEqual([]);
  });
});
