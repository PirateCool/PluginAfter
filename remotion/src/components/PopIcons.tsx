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
              backgroundColor: 'rgba(25, 30, 38, 0.88)',
              borderRadius: 4,
              padding: 10,
              border: '1px solid rgba(255, 222, 128, 0.2)',
              width: 100,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {src ? (
              <Img src={src} style={{width: 80, height: 80, objectFit: 'contain', borderRadius: 4}} />
            ) : (
              <div style={{width: 80, height: 80, borderRadius: 4, backgroundColor: '#232A35'}} />
            )}
          </div>
        );
      })}
    </div>
  );
};
