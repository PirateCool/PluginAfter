import React from 'react';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const Texte: React.FC<Props> = ({entry, fps}) => {
  const text = entry.texts[0] ?? '';

  return (
    <div className="bg-gray-900/80 rounded-lg px-6 py-4 max-w-md">
      <p className="text-white text-lg leading-relaxed">{text}</p>
    </div>
  );
};
