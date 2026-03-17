import {registerRoot} from 'remotion';
import {Composition, Folder} from 'remotion';
import React from 'react';
import {OverlayRoot} from './components/OverlayRoot';
import {CoachingComposition} from './components/CoachingComposition';
import {sampleTimeline} from './data/sample';
import {derushIntroTimeline} from './data/derush-intro';
import {CoachingCompositionSchema, OverlayCompositionSchema} from './schemas';
import './styles/global.css';

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main composition: coach video + overlays from real derush */}
      <Composition
        id="DerushIntro"
        component={CoachingComposition}
        schema={CoachingCompositionSchema}
        durationInFrames={Math.round(derushIntroTimeline.durationInSeconds * derushIntroTimeline.fps)}
        fps={derushIntroTimeline.fps}
        width={derushIntroTimeline.width}
        height={derushIntroTimeline.height}
        defaultProps={{
          timeline: derushIntroTimeline,
        }}
        calculateMetadata={async ({props}) => {
          const tl = props.timeline || derushIntroTimeline;
          return {
            durationInFrames: Math.round(tl.durationInSeconds * tl.fps),
            fps: tl.fps,
            width: tl.width,
            height: tl.height,
          };
        }}
      />

      <Folder name="Tests">
        {/* Overlay-only (sample with all preset types) */}
        <Composition
          id="OverlayComposition"
          component={OverlayRoot}
          schema={OverlayCompositionSchema}
          durationInFrames={Math.round(sampleTimeline.durationInSeconds * sampleTimeline.fps)}
          fps={sampleTimeline.fps}
          width={sampleTimeline.width}
          height={sampleTimeline.height}
          defaultProps={{
            timeline: sampleTimeline,
          }}
          calculateMetadata={async ({props}) => {
            const tl = props.timeline || sampleTimeline;
            return {
              durationInFrames: Math.round(tl.durationInSeconds * tl.fps),
              fps: tl.fps,
              width: tl.width,
              height: tl.height,
            };
          }}
        />

        {/* Derush overlays without video */}
        <Composition
          id="DerushOverlayOnly"
          component={OverlayRoot}
          schema={OverlayCompositionSchema}
          durationInFrames={Math.round(derushIntroTimeline.durationInSeconds * derushIntroTimeline.fps)}
          fps={derushIntroTimeline.fps}
          width={derushIntroTimeline.width}
          height={derushIntroTimeline.height}
          defaultProps={{
            timeline: derushIntroTimeline,
          }}
        />
      </Folder>
    </>
  );
};

registerRoot(RemotionRoot);
