import {registerRoot} from 'remotion';
import {Composition, Folder} from 'remotion';
import React from 'react';
import {OverlayRoot} from './components/OverlayRoot';
import {CoachingComposition, CoachingProps} from './components/CoachingComposition';
import {OverlayRootProps} from './types';
import {sampleTimeline} from './data/sample';
import {derushIntroTimeline} from './data/derush-intro';
import './styles/global.css';

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main composition: coach video + overlays from real derush */}
      <Composition
        id="DerushIntro"
        component={CoachingComposition as unknown as React.FC}
        durationInFrames={Math.round(derushIntroTimeline.durationInSeconds * derushIntroTimeline.fps)}
        fps={derushIntroTimeline.fps}
        width={derushIntroTimeline.width}
        height={derushIntroTimeline.height}
        defaultProps={{
          timeline: derushIntroTimeline,
        } satisfies CoachingProps}
        calculateMetadata={async ({props}) => {
          const tl = (props as unknown as CoachingProps).timeline || derushIntroTimeline;
          return {
            durationInFrames: Math.round(tl.durationInSeconds * tl.fps),
            fps: tl.fps,
            width: tl.width,
            height: tl.height,
          };
        }}
      />

      <Folder name="Tests">
        {/* Overlay-only composition (no background video) */}
        <Composition
          id="OverlayComposition"
          component={OverlayRoot as unknown as React.FC}
          durationInFrames={Math.round(sampleTimeline.durationInSeconds * sampleTimeline.fps)}
          fps={sampleTimeline.fps}
          width={sampleTimeline.width}
          height={sampleTimeline.height}
          defaultProps={{
            timeline: sampleTimeline,
          }}
          calculateMetadata={async ({props}) => {
            const tl = (props as unknown as OverlayRootProps).timeline || sampleTimeline;
            return {
              durationInFrames: Math.round(tl.durationInSeconds * tl.fps),
              fps: tl.fps,
              width: tl.width,
              height: tl.height,
            };
          }}
        />

        {/* Derush overlays without video background */}
        <Composition
          id="DerushOverlayOnly"
          component={OverlayRoot as unknown as React.FC}
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
