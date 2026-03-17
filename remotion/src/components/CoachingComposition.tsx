import React, {useMemo} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Saira';
import {TimelineEntry} from '../types';
import {z} from 'zod';
import {CoachingCompositionSchema} from '../schemas';

// Load Saira font (Skillcamp.gg brand)
const {fontFamily} = loadFont();
import {Titre} from './Titre';
import {Texte} from './Texte';
import {TitrePlusTexte} from './TitrePlusTexte';
import {Bulletpoint} from './Bulletpoint';
import {PopUp} from './PopUp';
import {PopIcons} from './PopIcons';
import {ChampionFocus} from './ChampionFocus';
import {Conclusion} from './Conclusion';
import {OverlayWrapper} from './OverlayWrapper';
import {CoachVideo} from './CoachVideo';
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

export type CoachingProps = z.infer<typeof CoachingCompositionSchema>;

/**
 * Full coaching composition:
 * - Coach video as background (full screen, coach visible on the left)
 * - Overlays rendered on the right side
 */
export const CoachingComposition: React.FC<CoachingProps> = ({timeline, videoSrc}) => {
  const {fps, entries} = timeline;
  const {width, height} = useVideoConfig();

  const placements = useMemo(
    () => computePlacements(entries, width, height),
    [entries, width, height]
  );

  const placementMap = useMemo(() => {
    const map: Record<string, PlacedEntry> = {};
    for (const p of placements) {
      map[p.entry.id] = p;
    }
    return map;
  }, [placements]);

  return (
    <AbsoluteFill>
      {/* Layer 1: Coach video background */}
      <CoachVideo src={videoSrc} />

      {/* Layer 2: Semi-transparent gradient on the right for overlay readability */}
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '45%',
            height: '100%',
            background: 'linear-gradient(to right, transparent 0%, rgba(25,30,38,0.35) 30%, rgba(25,30,38,0.5) 100%)',
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>

      {/* Layer 3: Overlays */}
      <AbsoluteFill>
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
    </AbsoluteFill>
  );
};
