import React from 'react';
import {TimelineEntry} from '../types';

export const Texte: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const text = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '24px 36px',
        borderLeft: '4px solid rgba(255, 222, 128, 0.15)',
      }}
    >
      <p
        style={{
          color: '#FCF9F2',
          fontSize: 32,
          fontWeight: 400,
          lineHeight: 1.4,
          margin: 0,
          fontFamily: "'Saira', system-ui, sans-serif",
        }}
      >
        {text}
      </p>
    </div>
  );
};
