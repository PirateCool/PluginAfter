import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

export const ChampionFocus: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const image = entry.images[0];
  const src = image?.resolvedUrl ?? image?.path ?? '';
  const name = entry.texts[0] ?? '';
  const context = entry.texts[1] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        border: '1px solid rgba(255, 222, 128, 0.15)',
      }}
    >
      {src ? (
        <div style={{flexShrink: 0, width: 120, height: 120, borderRadius: 4, overflow: 'hidden', border: '2px solid #FFDE80'}}>
          <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      ) : (
        <div style={{flexShrink: 0, width: 120, height: 120, borderRadius: 4, backgroundColor: '#232A35', border: '2px solid #FFDE80'}} />
      )}
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <span style={{color: '#FFDE80', fontSize: 34, fontWeight: 700, fontFamily: "'Saira', system-ui, sans-serif"}}>
          {name}
        </span>
        {context && (
          <span style={{color: 'rgba(252, 249, 242, 0.7)', fontSize: 26, fontWeight: 400, lineHeight: 1.35, fontFamily: "'Saira', system-ui, sans-serif"}}>
            {context}
          </span>
        )}
      </div>
    </div>
  );
};
