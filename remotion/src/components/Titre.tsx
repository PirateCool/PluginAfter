import React from 'react';
import {TimelineEntry} from '../types';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const Titre: React.FC<Props> = ({entry, fps}) => {
  const title = entry.texts[0] ?? '';

  return (
    <div className="bg-black/75 rounded-xl px-8 py-5" style={{maxWidth: 640}}>
      <h1
        className="text-white text-3xl font-bold"
        style={{borderLeft: '4px solid #C89B3C', paddingLeft: '16px'}}
      >
        {title}
      </h1>
    </div>
  );
};
