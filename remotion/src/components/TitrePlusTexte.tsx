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
    <div className="bg-black/75 rounded-xl px-8 py-5" style={{maxWidth: 640}}>
      <h2
        className="text-white text-2xl font-bold mb-2"
        style={{borderBottom: '2px solid #C89B3C', paddingBottom: '8px'}}
      >
        {title}
      </h2>
      <p className="text-gray-200 text-lg leading-relaxed mt-3">{subtitle}</p>
    </div>
  );
};
