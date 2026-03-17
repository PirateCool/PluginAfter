import React, {useMemo} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {TimelineEntry} from '../types';
import {z} from 'zod';
import {OverlayCompositionSchema} from '../schemas';

type OverlayRootProps = z.infer<typeof OverlayCompositionSchema>;
import {Titre} from './Titre';
import {Texte} from './Texte';
import {TitrePlusTexte} from './TitrePlusTexte';
import {Bulletpoint} from './Bulletpoint';
import {PopUp} from './PopUp';
import {PopIcons} from './PopIcons';
import {ChampionFocus} from './ChampionFocus';
import {Conclusion} from './Conclusion';
import {OverlayWrapper} from './OverlayWrapper';
import {computePlacements, PlacedEntry} from '../hooks/usePlacement';

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
  const {width, height} = useVideoConfig();

  // Precompute placements for all entries (anti-overlap)
  const placements = useMemo(
    () => computePlacements(entries, width, height),
    [entries, width, height]
  );

  // Build a lookup map id → placement
  const placementMap = useMemo(() => {
    const map: Record<string, PlacedEntry> = {};
    for (const p of placements) {
      map[p.entry.id] = p;
    }
    return map;
  }, [placements]);

  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      {entries.map((entry) => {
        const Component = COMPONENT_MAP[entry.presetName] || Texte;
        const placement = placementMap[entry.id];

        return (
          <OverlayWrapper
            key={entry.id}
            entry={entry}
            fps={fps}
            placement={placement}
          >
            <Component entry={entry} fps={fps} />
          </OverlayWrapper>
        );
      })}
    </AbsoluteFill>
  );
};
