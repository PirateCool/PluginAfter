import React from 'react';
import {TimelineEntry} from '../types';

export const Conclusion: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const message = entry.texts[0] ?? '';

  return (
    <div
      style={{
        width: 680,
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: '36px 40px',
        border: '1px solid #FFDE80',
        boxShadow: '0 0 60px rgba(255, 222, 128, 0.25), 0 8px 32px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: '#FCF9F2',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.3,
          margin: 0,
          fontFamily: "'Saira', system-ui, sans-serif",
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        {message}
      </p>
    </div>
  );
};
