import React from 'react';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const Texte: React.FC<Props> = ({entry, fps}) => {
  const text = entry.texts[0] ?? '';

  return (
    <div className="bg-black/75 rounded-xl px-8 py-5" style={{maxWidth: 640}}>
      <p className="text-white text-lg leading-relaxed">{text}</p>
    </div>
  );
};
