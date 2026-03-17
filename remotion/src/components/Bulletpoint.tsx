import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {TimelineEntry} from '../types';

/**
 * Single bullet item with spring-based reveal animation.
 * Slides in from right with blur, using spring physics for a punchy feel.
 */
const BulletItem: React.FC<{
  text: string;
  revealFrame: number;
  fps: number;
}> = ({text, revealFrame, fps}) => {
  const frame = useCurrentFrame();

  // Spring-based entrance — punchy with slight overshoot
  const progress = spring({
    frame: frame - revealFrame,
    fps,
    config: {damping: 14, stiffness: 120, mass: 0.8},
  });

  // Before reveal frame: invisible
  const opacity = frame < revealFrame ? 0 : progress;
  const translateX = frame < revealFrame ? 40 : interpolate(progress, [0, 1], [40, 0]);
  const blurVal = frame < revealFrame ? 8 : interpolate(progress, [0, 1], [8, 0]);
  // Scale from 95% to 100% for a subtle "pop" effect
  const scale = frame < revealFrame ? 0.95 : interpolate(progress, [0, 1], [0.95, 1]);

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingTop: 10,
        paddingBottom: 10,
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
        filter: blurVal > 0.2 ? `blur(${blurVal}px)` : 'none',
        transformOrigin: 'left center',
      }}
    >
      {/* Gold diamond marker with glow */}
      <span
        style={{
          color: '#FFDE80',
          fontSize: 24,
          lineHeight: '30px',
          flexShrink: 0,
          textShadow: '0 0 8px rgba(255, 222, 128, 0.4)',
        }}
      >
        &#9670;
      </span>
      <span
        style={{
          color: '#FCF9F2',
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.3,
          fontFamily: "'Saira', system-ui, sans-serif",
        }}
      >
        {text}
      </span>
    </li>
  );
};

/**
 * Title with its own spring reveal animation.
 */
const TitleReveal: React.FC<{
  text: string;
  revealFrame: number;
  fps: number;
}> = ({text, revealFrame, fps}) => {
  const frame = useCurrentFrame();

  const progress = spring({
    frame: frame - revealFrame,
    fps,
    config: {damping: 16, stiffness: 150, mass: 0.6},
  });

  const opacity = frame < revealFrame ? 0 : progress;
  const translateY = frame < revealFrame ? -20 : interpolate(progress, [0, 1], [-20, 0]);
  // Gold underline grows from left
  const lineWidth = frame < revealFrame ? 0 : interpolate(progress, [0, 1], [0, 100]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          color: '#FCF9F2',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          paddingBottom: 14,
          fontFamily: "'Saira', system-ui, sans-serif",
        }}
      >
        {text}
      </h3>
      {/* Animated gold underline */}
      <div
        style={{
          height: 3,
          backgroundColor: '#FFDE80',
          width: `${lineWidth}%`,
          borderRadius: 2,
          boxShadow: '0 0 10px rgba(255, 222, 128, 0.4)',
        }}
      />
    </div>
  );
};

/**
 * Bulletpoint overlay with dynamic, synced animations.
 *
 * Timeline data controls the exact timing:
 * - Title appears at frame 0 of the overlay (or entry.texts[0] inOffset if set)
 * - Each bullet appears at its `inOffset` (seconds from overlay start)
 *
 * Example for synced-to-speech bullets:
 * ```json
 * {
 *   "startTime": 51,
 *   "duration": 16,
 *   "texts": ["3 clés pour progresser"],
 *   "bullets": [
 *     {"text": "Joue sérieusement", "inOffset": 4},
 *     {"text": "Pratique régulièrement", "inOffset": 11},
 *     {"text": "Aie une routine d'entraînement", "inOffset": 14}
 *   ]
 * }
 * ```
 */
export const Bulletpoint: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';
  const bullets = entry.bullets ?? [];
  const {fps} = useVideoConfig();

  // Title reveals at the start (frame 0 of the overlay's local time)
  const titleRevealFrame = 0;

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '28px 36px',
      }}
    >
      {title && (
        <TitleReveal text={title} revealFrame={titleRevealFrame} fps={fps} />
      )}
      <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
        {bullets.map((bullet, i) => {
          // inOffset = seconds from the start of this overlay
          // Default: stagger 2s apart if no inOffset specified
          const offsetSec = bullet.inOffset ?? (i + 1) * 2;
          const revealFrame = Math.round(offsetSec * fps);
          return (
            <BulletItem
              key={i}
              text={bullet.text}
              revealFrame={revealFrame}
              fps={fps}
            />
          );
        })}
      </ul>
    </div>
  );
};
