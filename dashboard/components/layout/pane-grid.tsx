"use client";

import React from 'react';

const PANE_NAMES = [
  'Health', 'Events', 'Progress',
  'Status', 'Failures', 'Actions', 'Summary', 'Sync',
] as const;

interface PaneGridProps {
  children: React.ReactNode[];
  activePane: number;
  onPaneSelect: (index: number) => void;
}

export function PaneGrid({ children, activePane }: PaneGridProps) {
  return (
    <>
      {/* Phone: single pane visible, <md */}
      <div className="block md:hidden">
        <div
          id={`pane-${activePane}`}
          aria-label={PANE_NAMES[activePane] ?? 'Pane'}
        >
          {children[activePane]}
        </div>
      </div>

      {/* Tablet: 2x2 grid of first 4 panes, md to <lg */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:hidden">
        {children.slice(0, 4).map((child, index) => (
          <section
            key={index}
            id={`pane-${index}`}
            aria-label={PANE_NAMES[index]}
          >
            {child}
          </section>
        ))}
      </div>

      {/* Laptop: full 7-pane grid, lg+ */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
        {/* Row 1: Panes 0-2 */}
        {children.slice(0, 3).map((child, index) => (
          <section
            key={index}
            id={`pane-${index}`}
            aria-label={PANE_NAMES[index]}
          >
            {child}
          </section>
        ))}
        {/* Row 2: Panes 3-5 */}
        {children.slice(3, 6).map((child, index) => (
          <section
            key={index + 3}
            id={`pane-${index + 3}`}
            aria-label={PANE_NAMES[index + 3]}
          >
            {child}
          </section>
        ))}
        {/* Row 3: Panes 6-7 */}
        {children[6] && (
          <section
            id="pane-6"
            aria-label={PANE_NAMES[6]}
            className={children[7] ? '' : 'col-span-3'}
          >
            {children[6]}
          </section>
        )}
        {children[7] && (
          <section
            id="pane-7"
            aria-label={PANE_NAMES[7]}
            className="col-span-2"
          >
            {children[7]}
          </section>
        )}
      </div>
    </>
  );
}
