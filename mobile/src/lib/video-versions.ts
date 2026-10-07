import { clipStreamUrl } from "../api/endpoints/clips";
import { renderStreamUrl } from "../api/endpoints/color-grading";
import { videoStreamUrl } from "../api/endpoints/videos";
import type { Clip, ClipRender, RawClip, Video } from "../api/types";
import type { MediaKind } from "../components/player/video-player-screen";

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
  streamUrl: string | null;
  /** Base filename for gallery downloads (extension added downstream). */
  filename: string;
  /** Player route params for previewing this exact version. */
  playerId: string | null;
  playerKind: MediaKind;
  render: ClipRender | null;
}

export function buildVideoVersions(
  clip: RawClip,
  renders: ClipRender[],
  title: string,
): VideoVersion[] {
  const versions: VideoVersion[] = [
    {
      render: null,
      key: "original",
      filename: title,
      label: "Original",
      isOriginal: true,
      playerId: clip.videoId ? clip.videoId : null,
      streamUrl: clip.videoId ? videoStreamUrl(clip.videoId) : null,
      playerKind: "video",
    },
  ];
  for (const render of renders) {
    if (render.state !== "READY") continue;
    const presetName = render.colorGradingPreset?.name ?? "Graded";
    versions.push({
      key: render.id,
      label: presetName,
      isOriginal: false,
      streamUrl: renderStreamUrl(render.id),
      filename: `${title} - ${presetName}`,
      playerId: render.id,
      playerKind: "render",
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
      key: "original",
      label: "Original",
      isOriginal: true,
      streamUrl: clipStreamUrl(clip.id),
      filename: title,
      playerId: clip.id,
      playerKind: "clip",
      render: null,
    },
  ];
  for (const render of renders) {
    if (render.state !== "READY") continue;
    const presetName = render.colorGradingPreset?.name ?? "Graded";
    versions.push({
      key: render.id,
      label: presetName,
      isOriginal: false,
      streamUrl: renderStreamUrl(render.id),
      filename: `${title} - ${presetName}`,
      playerId: render.id,
      playerKind: "render",
      render,
    });
  }
  return versions;
}
