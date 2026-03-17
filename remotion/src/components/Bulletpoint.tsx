import React from 'react';
import {useVideoConfig} from 'remotion';
import {TimelineEntry} from '../types';
import {useBulletReveal} from '../hooks/useAnimations';
import {OverlayWrapper} from './OverlayWrapper';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

const BulletItem: React.FC<{
  text: string;
  revealFrame: number;
  animDurationFrames: number;
}> = ({text, revealFrame, animDurationFrames}) => {
  const anim = useBulletReveal({revealFrame, animDurationFrames});

  return (
    <li
      className="flex items-start gap-3 py-1"
      style={{
        opacity: anim.opacity,
        transform: `translateX(${anim.translateX}px)`,
        filter: anim.blur > 0.1 ? `blur(${anim.blur}px)` : 'none',
      }}
    >
      <span style={{color: '#C89B3C', fontSize: '20px', lineHeight: '28px'}}>&#9670;</span>
      <span className="text-white text-lg">{text}</span>
    </li>
  );
};

export const Bulletpoint: React.FC<Props> = ({entry, fps}) => {
  const title = entry.texts[0] ?? '';
  const bullets = entry.bullets ?? [];
  const {fps: configFps} = useVideoConfig();

  const defaultStagger = 0.4; // seconds between each bullet
  const animDurationFrames = Math.round(0.3 * configFps);

  return (
    <OverlayWrapper entry={entry} fps={fps}>
      <div className="bg-gray-900/80 rounded-xl px-7 py-5 max-w-lg">
        {title && (
          <h3
            className="text-white text-2xl font-bold mb-3"
            style={{borderBottom: '2px solid #C89B3C', paddingBottom: '6px'}}
          >
            {title}
          </h3>
        )}
        <ul className="mt-2 space-y-1">
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
    </OverlayWrapper>
  );
};
