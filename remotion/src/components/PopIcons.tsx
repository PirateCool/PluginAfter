import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

export const PopIcons: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const images = entry.images ?? [];

  return (
    <div style={{display: 'flex', gap: 16}}>
      {images.map((image, i) => {
        const src = image.resolvedUrl ?? image.path ?? '';
        return (
          <div
            key={i}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.82)',
              borderRadius: 14,
              padding: 10,
              border: '2px solid rgba(200, 155, 60, 0.5)',
              width: 100,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {src ? (
              <Img src={src} style={{width: 80, height: 80, objectFit: 'contain', borderRadius: 8}} />
            ) : (
              <div style={{width: 80, height: 80, borderRadius: 8, backgroundColor: '#1a1a2e'}} />
            )}
          </div>
        );
      })}
    </div>
  );
};
