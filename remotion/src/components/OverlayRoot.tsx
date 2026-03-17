import React from 'react';
import {AbsoluteFill} from 'remotion';
import {OverlayRootProps, TimelineEntry} from '../types';
import {Titre} from './Titre';
import {Texte} from './Texte';
import {TitrePlusTexte} from './TitrePlusTexte';
import {Bulletpoint} from './Bulletpoint';
import {PopUp} from './PopUp';
import {PopIcons} from './PopIcons';
import {ChampionFocus} from './ChampionFocus';
import {Conclusion} from './Conclusion';
import {OverlayWrapper} from './OverlayWrapper';

const COMPONENT_MAP: Record<string, React.FC<{entry: TimelineEntry; fps: number}>> = {
  'Titre': Titre,
  'Texte': Texte,
  'Titre + Texte': TitrePlusTexte,
  'Bulletpoint': Bulletpoint,
  'Bulletpoint 3': Bulletpoint,
  'Bulletpoint 5': Bulletpoint,
  'Bulletpoint 9': Bulletpoint,
  'Pop up': PopUp,
  'Pop icons': PopIcons,
  'Champion focus': ChampionFocus,
  'Item focus': ChampionFocus,
  'Spell / Rune': ChampionFocus,
  'Objectif': ChampionFocus,
  'Conclusion': Conclusion,
  'Erreur à éviter': TitrePlusTexte,
  'Astuce coach': TitrePlusTexte,
  'Checklist': Bulletpoint,
};

export const OverlayRoot: React.FC<OverlayRootProps> = ({timeline}) => {
  const {fps, entries} = timeline;

  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      {entries.map((entry) => {
        const Component = COMPONENT_MAP[entry.presetName] || Texte;
        return (
          <OverlayWrapper key={entry.id} entry={entry} fps={fps}>
            <Component entry={entry} fps={fps} />
          </OverlayWrapper>
        );
      })}
    </AbsoluteFill>
  );
};
