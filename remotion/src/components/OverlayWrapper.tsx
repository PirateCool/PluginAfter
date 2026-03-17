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

/**
 * Layout: coach LEFT (~55%), overlays RIGHT (~45%).
 * Overlays vertically centered in the right zone.
 */
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

  const posY = placement ? placement.y : (entry.position?.y ?? 200);
  const isVisual = entry.family === 'visual';

  return (
    <Sequence
      from={startFrame}
      durationInFrames={durationFrames}
      name={entry.presetName}
      premountFor={Math.round(0.5 * fps)}
    >
      <div
        style={{
          position: 'absolute',
          right: isVisual ? 720 : 50,
          top: posY,
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
