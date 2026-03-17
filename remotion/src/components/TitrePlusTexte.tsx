import React from 'react';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const TitrePlusTexte: React.FC<Props> = ({entry, fps}) => {
  const title = entry.texts[0] ?? '';
  const subtitle = entry.texts[1] ?? '';

  return (
    <div className="bg-gray-900/80 rounded-xl px-7 py-5 max-w-lg">
      <h2
        className="text-white text-3xl font-bold mb-2"
        style={{borderBottom: '2px solid #C89B3C', paddingBottom: '8px'}}
      >
        {title}
      </h2>
      <p className="text-gray-300 text-lg leading-relaxed mt-3">{subtitle}</p>
    </div>
  );
};
