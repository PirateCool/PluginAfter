import React from 'react';
import {Video} from '@remotion/media';
import {AbsoluteFill, staticFile} from 'remotion';

interface Props {
  src?: string;
}

/**
 * Full-screen coach video background.
 * The coach appears on the LEFT side of the screen.
 * Overlays go on the RIGHT side.
 */
export const CoachVideo: React.FC<Props> = ({src}) => {
  const videoSrc = src || staticFile('coach-video.mp4');

  return (
    <AbsoluteFill>
      <Video
        src={videoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </AbsoluteFill>
  );
};
