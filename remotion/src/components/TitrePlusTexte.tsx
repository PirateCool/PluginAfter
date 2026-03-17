import React from 'react';
import {TimelineEntry} from '../types';

export const TitrePlusTexte: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const title = entry.texts[0] ?? '';
  const subtitle = entry.texts[1] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: '28px 36px',
      }}
    >
      <h2
        style={{
          color: '#FFFFFF',
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.2,
          margin: 0,
          paddingBottom: 14,
          borderBottom: '3px solid #C89B3C',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: '#D4D4D4',
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.4,
          margin: 0,
          marginTop: 16,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {subtitle}
      </p>
    </div>
  );
};
