import { View } from 'react-native';
import type { ProjectDetail } from '../../api/types';
import type { MediaKind } from '../player/video-player-screen';
import { ClipCard } from '../clips/clip-card';
import { RawVideoCard } from '../raw-videos/raw-video-card';
import { VideoCard } from '../videos/video-card';
import { EmptyState } from '../ui/empty-state';

/** Tabbed content of the project detail screen: clips / ready / source. */

export type ProjectTabKey = 'clips' | 'ready' | 'source';

export interface ProjectTabContentProps {
  project: ProjectDetail;
  tab: ProjectTabKey;
  onPlay: (mediaId: string, kind: MediaKind, title: string) => void;
}

export function ProjectTabContent({ project, tab, onPlay }: ProjectTabContentProps) {
  const readyVideos = project.videos.filter((video) => video.status === 'ACTIVE');

  if (tab === 'clips') {
    return (
      <TabSection
        isEmpty={project.clips.length === 0}
        emptyIcon="sparkles-outline"
        emptyTitle="No clips yet"
        emptyMessage="The AI is still listening for viral moments — check back in a minute."
      >
        {project.clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            onPlay={() => onPlay(clip.id, 'clip', clip.clipInfo?.title ?? 'Clip')}
          />
        ))}
      </TabSection>
    );
  }

  if (tab === 'ready') {
    return (
      <TabSection
        isEmpty={readyVideos.length === 0}
        emptyIcon="film-outline"
        emptyTitle="No ready videos yet"
        emptyMessage="Once clips are cut, the final videos land here — ready to post."
      >
        {readyVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            poster={project.thumbnail}
            onPlay={() => onPlay(video.id, 'video', video.title ?? 'Video')}
          />
        ))}
      </TabSection>
    );
  }

  return (
    <TabSection
      isEmpty={project.rawVideos.length === 0}
      emptyIcon="cloud-download-outline"
      emptyTitle="Source not here yet"
      emptyMessage="The full podcast video is still being fetched."
    >
      {project.rawVideos.map((rawVideo) => (
        <RawVideoCard
          key={rawVideo.id}
          rawVideo={rawVideo}
          onPlay={() => onPlay(rawVideo.id, 'raw', rawVideo.title ?? 'Source video')}
        />
      ))}
    </TabSection>
  );
}

interface TabSectionProps {
  isEmpty: boolean;
  emptyIcon: React.ComponentProps<typeof EmptyState>['icon'];
  emptyTitle: string;
  emptyMessage: string;
  children: React.ReactNode;
}

function TabSection({ isEmpty, emptyIcon, emptyTitle, emptyMessage, children }: TabSectionProps) {
  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;
  }
  return <View style={{ gap: 14 }}>{children}</View>;
}
