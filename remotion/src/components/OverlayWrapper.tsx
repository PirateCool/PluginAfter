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
 * Layout: coach on the LEFT (~60%), overlays on the RIGHT (~40%).
 * Text overlays: right-aligned with 40px margin from right edge.
 * Visual overlays: shifted further left to not overlap text.
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

  const isVisual = entry.family === 'visual';
  const posY = placement ? placement.y : (entry.position?.y ?? 80);

  // Right margin from edge of frame
  const RIGHT_MARGIN = 40;
  // Visual overlays go further left (next to the text column)
  const VISUAL_RIGHT = 700;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    right: isVisual
      ? (entry.position?.x ?? VISUAL_RIGHT)
      : (entry.position?.x ?? RIGHT_MARGIN),
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
        }}
      >
        {children}
      </div>
    </Sequence>
  );
};
