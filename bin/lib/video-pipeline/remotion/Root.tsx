import React from 'react';
import { Composition } from 'remotion';
import { BrandedVideo } from './BrandedVideo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="branded"
    component={BrandedVideo}
    durationInFrames={150}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{
      colors: {
        background: '#0a0a0a',
        primary: '#ffffff',
        accent: '#3b82f6',
      },
      fonts: {
        heading: 'Arial',
        body: 'Arial',
      },
      title: 'Product Demo',
      subtitle: '',
      durationInFrames: 150,
    }}
  />
);
