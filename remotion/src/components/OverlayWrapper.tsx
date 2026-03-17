import React from 'react';
import {Sequence} from 'remotion';
import {useOutroAnimation} from '../hooks/useAnimations';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  children: React.ReactNode;
  fps: number;
}

export const OverlayWrapper: React.FC<Props> = ({entry, children, fps}) => {
  const startFrame = Math.round(entry.startTime * fps);
  const durationFrames = Math.round(entry.duration * fps);
  const anim = entry.animation || {fade: 0.35, moveX: 0, moveY: -100, blur: 50};

  const outro = useOutroAnimation({
    startFrame,
    durationFrames,
    fade: anim.fade,
    moveX: anim.moveX,
    moveY: anim.moveY,
    blur: anim.blur,
  });

  return (
    <Sequence from={startFrame} durationInFrames={durationFrames} name={entry.presetName}>
      <div
        style={{
          position: 'absolute',
          right: entry.position?.x ?? 100,
          top: entry.position?.y ?? 100,
          opacity: outro.opacity,
          transform: `translate(${outro.translateX}px, ${outro.translateY}px)`,
          filter: outro.blur > 0.1 ? `blur(${outro.blur}px)` : 'none',
        }}
      >
        {children}
      </div>
    </Sequence>
  );
};
