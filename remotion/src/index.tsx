import {registerRoot} from 'remotion';
import {Composition} from 'remotion';
import React from 'react';
import {OverlayRoot} from './components/OverlayRoot';
import {OverlayRootProps, TimelineData} from './types';
import {sampleTimeline} from './data/sample';
import './styles/global.css';

const RemotionRoot: React.FC = () => {
  return (
    <>
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
    </>
  );
};

registerRoot(RemotionRoot);
