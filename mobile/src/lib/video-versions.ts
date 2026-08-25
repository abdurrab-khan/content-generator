import { clipStreamUrl } from '../api/endpoints/clips';
import { renderStreamUrl } from '../api/endpoints/color-grading';
import { videoStreamUrl } from '../api/endpoints/videos';
import type { Clip, ClipRender, Video } from '../api/types';
import type { MediaKind } from '../components/player/video-player-screen';

/**
 * A playable/downloadable "version" of a ready video: the original cut plus
 * one entry per READY graded variant. Original always comes first and gets
 * no badge; graded versions are labeled with their preset name.
 */
export interface VideoVersion {
  /** 'original' for the base video, otherwise the render id. */
  key: string;
  /** Badge/row label — 'Original' or the preset name. */
  label: string;
  isOriginal: boolean;
  streamUrl: string;
  /** Base filename for gallery downloads (extension added downstream). */
  filename: string;
  /** Player route params for previewing this exact version. */
  playerId: string;
  playerKind: MediaKind;
  render: ClipRender | null;
}

export function buildVideoVersions(
  video: Video,
  renders: ClipRender[],
  title: string,
): VideoVersion[] {
  const versions: VideoVersion[] = [
    {
      key: 'original',
      label: 'Original',
      isOriginal: true,
      streamUrl: videoStreamUrl(video.id),
      filename: title,
      playerId: video.id,
      playerKind: 'video',
      render: null,
    },
  ];
  for (const render of renders) {
    if (render.state !== 'READY') continue;
    const presetName = render.colorGradingPreset?.name ?? 'Graded';
    versions.push({
      key: render.id,
      label: presetName,
      isOriginal: false,
      streamUrl: renderStreamUrl(render.id),
      filename: `${title} - ${presetName}`,
      playerId: render.id,
      playerKind: 'render',
      render,
    });
  }
  return versions;
}

/**
 * Same version list, but for a raw clip (Clips tab): the original is the
 * cut clip itself, variants are its READY renders.
 */
export function buildClipVersions(
  clip: Clip,
  renders: ClipRender[],
  title: string,
): VideoVersion[] {
  const versions: VideoVersion[] = [
    {
      key: 'original',
      label: 'Original',
      isOriginal: true,
      streamUrl: clipStreamUrl(clip.id),
      filename: title,
      playerId: clip.id,
      playerKind: 'clip',
      render: null,
    },
  ];
  for (const render of renders) {
    if (render.state !== 'READY') continue;
    const presetName = render.colorGradingPreset?.name ?? 'Graded';
    versions.push({
      key: render.id,
      label: presetName,
      isOriginal: false,
      streamUrl: renderStreamUrl(render.id),
      filename: `${title} - ${presetName}`,
      playerId: render.id,
      playerKind: 'render',
      render,
    });
  }
  return versions;
}
