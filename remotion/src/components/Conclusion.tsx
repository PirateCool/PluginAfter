import React from 'react';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const Conclusion: React.FC<Props> = ({entry, fps}) => {
  const message = entry.texts[0] ?? '';

  return (
    <div
      className="bg-black/75 rounded-xl px-8 py-5 text-center"
      style={{
        maxWidth: 640,
        border: '2px solid #C89B3C',
        boxShadow: '0 0 40px rgba(200, 155, 60, 0.2)',
      }}
    >
      <p
        className="text-white text-2xl font-semibold leading-snug"
        style={{textShadow: '0 2px 8px rgba(0,0,0,0.5)'}}
      >
        {message}
      </p>
    </div>
  );
};
