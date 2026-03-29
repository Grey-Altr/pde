import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, spring } from 'remotion';

interface BrandedVideoProps {
  colors: {
    background?: string;
    primary?: string;
    accent?: string;
  };
  fonts: {
    heading?: string;
    body?: string;
  };
  title: string;
  subtitle?: string;
  durationInFrames?: number;
}

export const BrandedVideo: React.FC<BrandedVideoProps> = ({
  colors,
  fonts,
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const background = colors.background || '#0a0a0a';
  const primary = colors.primary || '#ffffff';
  const accent = colors.accent || '#3b82f6';
  const headingFont = fonts.heading || 'Arial';
  const bodyFont = fonts.body || 'Arial';
  const displayTitle = title || 'Product Demo';

  // Spring animation for title entrance
  const titleOpacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  const titleY = spring({
    frame,
    fps,
    from: 40,
    to: 0,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  // Subtitle entrance delayed by 15 frames
  const subtitleOpacity = spring({
    frame: Math.max(0, frame - 15),
    fps,
    from: 0,
    to: 1,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      {/* Title sequence — visible from frame 0 */}
      <Sequence from={0}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontSize: 96,
              fontFamily: headingFont,
              color: primary,
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 32,
            }}
          >
            {displayTitle}
          </div>

          {subtitle ? (
            <div
              style={{
                opacity: subtitleOpacity,
                fontSize: 48,
                fontFamily: bodyFont,
                color: accent,
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      {/* Accent bar at bottom */}
      <Sequence from={10}>
        <AbsoluteFill>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 8,
              backgroundColor: accent,
              opacity: titleOpacity,
            }}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
