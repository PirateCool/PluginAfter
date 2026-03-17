import React from 'react';
import {useVideoConfig} from 'remotion';
import {TimelineEntry} from '../types';
import {useBulletReveal} from '../hooks/useAnimations';

const BulletItem: React.FC<{
  text: string;
  revealFrame: number;
  animDurationFrames: number;
}> = ({text, revealFrame, animDurationFrames}) => {
  const anim = useBulletReveal({revealFrame, animDurationFrames});

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        paddingTop: 8,
        paddingBottom: 8,
        opacity: anim.opacity,
        transform: `translateX(${anim.translateX}px)`,
        filter: anim.blur > 0.1 ? `blur(${anim.blur}px)` : 'none',
      }}
    >
      <span style={{color: '#C89B3C', fontSize: 28, lineHeight: '34px', flexShrink: 0}}>&#9670;</span>
      <span
        style={{
          color: '#F0F0F0',
          fontSize: 28,
          fontWeight: 500,
          lineHeight: 1.35,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {text}
      </span>
    </li>
  );
};

export const Bulletpoint: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';
  const bullets = entry.bullets ?? [];
  const {fps: configFps} = useVideoConfig();

  const defaultStagger = 0.4;
  const animDurationFrames = Math.round(0.3 * configFps);

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: '28px 36px',
      }}
    >
      {title && (
        <h3
          style={{
            color: '#FFFFFF',
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: 0,
            paddingBottom: 12,
            borderBottom: '3px solid #C89B3C',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {title}
        </h3>
      )}
      <ul style={{listStyle: 'none', margin: 0, padding: 0, marginTop: 14}}>
        {bullets.map((bullet, i) => {
          const offsetSec = bullet.inOffset ?? i * defaultStagger;
          const revealFrame = Math.round(offsetSec * configFps);
          return (
            <BulletItem
              key={i}
              text={bullet.text}
              revealFrame={revealFrame}
              animDurationFrames={animDurationFrames}
            />
          );
        })}
      </ul>
    </div>
  );
};
