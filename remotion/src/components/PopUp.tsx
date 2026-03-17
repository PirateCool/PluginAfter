import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const PopUp: React.FC<Props> = ({entry, fps}) => {
  const image = entry.images[0];
  const src = image?.resolvedUrl ?? image?.path ?? '';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        border: '3px solid rgba(200, 155, 60, 0.5)',
      }}
    >
      {src && (
        <Img
          src={src}
          className="w-32 h-32"
          style={{display: 'block', objectFit: 'contain'}}
        />
      )}
    </div>
  );
};
