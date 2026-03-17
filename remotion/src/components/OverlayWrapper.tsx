import React from 'react';
import {Sequence} from 'remotion';
import {useOutroAnimation} from '../hooks/useAnimations';
import {TimelineEntry} from '../types';
import {PlacedEntry} from '../hooks/usePlacement';

interface Props {
  entry: TimelineEntry;
  children: React.ReactNode;
  fps: number;
  placement?: PlacedEntry;
}

export const OverlayWrapper: React.FC<Props> = ({entry, children, fps, placement}) => {
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

  const isVisual = entry.family === 'visual';

  // Use computed placement if available, otherwise fall back to manual position or defaults
  const posY = placement ? placement.y : (entry.position?.y ?? 100);

  // Text overlays: positioned from the right edge
  // Visual overlays: positioned from the right but shifted further left
  const posStyle: React.CSSProperties = isVisual
    ? {
        position: 'absolute',
        right: placement ? (placement.x > 0 ? placement.x : 100 + Math.abs(placement.x)) : (entry.position?.x ?? 420),
        top: posY,
      }
    : {
        position: 'absolute',
        right: entry.position?.x ?? 60,
        top: posY,
      };

  return (
    <Sequence
      from={startFrame}
      durationInFrames={durationFrames}
      name={entry.presetName}
      premountFor={Math.round(0.5 * fps)}
    >
      <div
        style={{
          ...posStyle,
          opacity: outro.opacity,
          transform: `translate(${outro.translateX}px, ${outro.translateY}px)`,
          filter: outro.blur > 0.1 ? `blur(${outro.blur}px)` : 'none',
          transition: 'none',
        }}
      >
        {children}
      </div>
    </Sequence>
  );
};
