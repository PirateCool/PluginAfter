import React from 'react';
import {TimelineEntry} from '../types';

export const Texte: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const text = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: '24px 36px',
        borderLeft: '4px solid rgba(200, 155, 60, 0.5)',
      }}
    >
      <p
        style={{
          color: '#F0F0F0',
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.4,
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {text}
      </p>
    </div>
  );
};
