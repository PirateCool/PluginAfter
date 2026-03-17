import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

export const PopUp: React.FC<{entry: TimelineEntry; fps: number}> = ({entry}) => {
  const image = entry.images[0];
  const src = image?.resolvedUrl ?? image?.path ?? '';

  return (
    <div
      style={{
        backgroundColor: 'rgba(25, 30, 38, 0.88)',
        borderRadius: 4,
        padding: 12,
        border: '1px solid #FFDE80',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {src ? (
        <Img src={src} style={{width: 160, height: 160, objectFit: 'cover', borderRadius: 4, display: 'block'}} />
      ) : (
        <div style={{width: 160, height: 160, borderRadius: 4, backgroundColor: '#232A35'}} />
      )}
    </div>
  );
};
