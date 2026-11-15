import React from 'react';
import {Composition} from 'remotion';
import {Full} from './Story.jsx';
import timing from './data/timing.json';
export const Root = () => (
  <Composition id="Story" component={Full} width={720} height={1280} fps={30}
    durationInFrames={Math.max(30, Math.round(timing.duration * 30))} />
);
