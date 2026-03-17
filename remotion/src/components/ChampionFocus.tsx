import React from 'react';
import {Img} from 'remotion';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const ChampionFocus: React.FC<Props> = ({entry, fps}) => {
  const image = entry.images[0];
  const src = image?.resolvedUrl ?? image?.path ?? '';
  const name = entry.texts[0] ?? '';
  const context = entry.texts[1] ?? '';

  return (
    <div
      className="bg-gray-900/80 rounded-xl flex items-center gap-5 px-5 py-4"
      style={{border: '2px solid rgba(200, 155, 60, 0.4)'}}
    >
      {src && (
        <div
          className="rounded-lg overflow-hidden flex-shrink-0"
          style={{
            width: '80px',
            height: '80px',
            border: '2px solid #C89B3C',
          }}
        >
          <Img
            src={src}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </div>
      )}
      <div className="flex flex-col">
        <span
          className="text-2xl font-bold"
          style={{color: '#C89B3C'}}
        >
          {name}
        </span>
        {context && (
          <span className="text-gray-300 text-base mt-1">{context}</span>
        )}
      </div>
    </div>
  );
};
