import React from 'react';
import {TimelineEntry} from '../types';

export const Titre: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: '28px 36px',
        borderLeft: '5px solid #C89B3C',
      }}
    >
      <h1
        style={{
          color: '#FFFFFF',
          fontSize: 42,
          fontWeight: 800,
          lineHeight: 1.2,
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
    </div>
  );
};
