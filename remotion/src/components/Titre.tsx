import React from 'react';
import {TimelineEntry} from '../types';

export const Titre: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '28px 36px',
        borderLeft: '4px solid #FFDE80',
        border: '1px solid rgba(255, 222, 128, 0.15)',
      }}
    >
      <h1
        style={{
          color: '#FCF9F2',
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          fontFamily: "'Saira', system-ui, sans-serif",
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
    </div>
  );
};
