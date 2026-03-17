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
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        border: '2px solid rgba(200, 155, 60, 0.4)',
      }}
    >
      {src ? (
        <div style={{flexShrink: 0, width: 120, height: 120, borderRadius: 12, overflow: 'hidden', border: '3px solid #C89B3C'}}>
          <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      ) : (
        <div style={{flexShrink: 0, width: 120, height: 120, borderRadius: 12, backgroundColor: '#1a1a2e', border: '3px solid #C89B3C'}} />
      )}
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <span style={{color: '#C89B3C', fontSize: 34, fontWeight: 800, fontFamily: 'system-ui, -apple-system, sans-serif'}}>
          {name}
        </span>
        {context && (
          <span style={{color: '#D4D4D4', fontSize: 26, fontWeight: 400, lineHeight: 1.35, fontFamily: 'system-ui, -apple-system, sans-serif'}}>
            {context}
          </span>
        )}
      </div>
    </div>
  );
};
