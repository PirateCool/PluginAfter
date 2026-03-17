import React from 'react';
import {TimelineEntry} from '../types';

export const Conclusion: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const message = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 16,
        padding: '36px 40px',
        border: '3px solid #C89B3C',
        boxShadow: '0 0 60px rgba(200, 155, 60, 0.25), 0 8px 32px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: '#FFFFFF',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.3,
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        {message}
      </p>
    </div>
  );
};
