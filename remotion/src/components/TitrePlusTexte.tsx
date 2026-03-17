import React from 'react';
import {TimelineEntry} from '../types';

export const TitrePlusTexte: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';
  const subtitle = entry.texts[1] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '28px 36px',
      }}
    >
      <h2
        style={{
          color: '#FCF9F2',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.2,
          margin: 0,
          paddingBottom: 14,
          borderBottom: '3px solid #FFDE80',
          fontFamily: "'Saira', system-ui, sans-serif",
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: 'rgba(252, 249, 242, 0.7)',
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.4,
          margin: 0,
          marginTop: 16,
          fontFamily: "'Saira', system-ui, sans-serif",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
};
