import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const PopIcons: React.FC<Props> = ({entry, fps}) => {
  const images = entry.images ?? [];

  return (
    <div className="flex gap-3">
      {images.map((image, i) => {
        const src = image.resolvedUrl ?? image.path ?? '';
        return (
          <div
            key={i}
            className="bg-gray-900/80 rounded-xl p-2 flex items-center justify-center"
            style={{
              border: '2px solid rgba(200, 155, 60, 0.3)',
              width: '72px',
              height: '72px',
            }}
          >
            {src && (
              <Img
                src={src}
                style={{
                  width: '56px',
                  height: '56px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
