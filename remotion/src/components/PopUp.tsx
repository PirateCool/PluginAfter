import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

export const PopUp: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const image = entry.images[0];
  const src = image?.resolvedUrl ?? image?.path ?? '';

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderRadius: 16,
        padding: 12,
        border: '3px solid #C89B3C',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {src ? (
        <Img src={src} style={{width: 160, height: 160, objectFit: 'cover', borderRadius: 10, display: 'block'}} />
      ) : (
        <div style={{width: 160, height: 160, borderRadius: 10, backgroundColor: '#1a1a2e'}} />
      )}
    </div>
  );
};
