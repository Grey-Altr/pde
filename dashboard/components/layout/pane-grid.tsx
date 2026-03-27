"use client";

import React from "react";

const PANE_NAMES = [
  "Health",
  "Events",
  "Progress",
  "Status",
  "Failures",
  "Actions",
  "Summary",
] as const;

interface PaneGridProps {
  children: React.ReactNode[];
  activePane: number;
  onPaneSelect: (index: number) => void;
}

export function PaneGrid({ children, activePane, onPaneSelect }: PaneGridProps) {
  return (
    <>
      {/* Phone: single pane visible at a time (<md) */}
      <div className="block md:hidden">
        <section
          id={`pane-${activePane}`}
          aria-label={PANE_NAMES[activePane]}
          className="w-full"
        >
          {children[activePane]}
        </section>
      </div>

      {/* Tablet: 2-column grid showing first 4 panes (md to <lg) */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:hidden">
        {children.slice(0, 4).map((child, index) => (
          <section
            key={index}
            id={`pane-${index}`}
            aria-label={PANE_NAMES[index]}
            className="w-full"
            onClick={() => onPaneSelect(index)}
          >
            {child}
          </section>
        ))}
      </div>

      {/* Laptop: full 7-pane grid layout (lg+) */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
        {/* Row 1: Panes 0-2 (Health, Events, Progress) */}
        {children.slice(0, 3).map((child, index) => (
          <section
            key={index}
            id={`pane-${index}`}
            aria-label={PANE_NAMES[index]}
            className="w-full"
          >
            {child}
          </section>
        ))}

        {/* Row 2: Panes 3-5 (Status, Failures, Actions) */}
        {children.slice(3, 6).map((child, index) => (
          <section
            key={index + 3}
            id={`pane-${index + 3}`}
            aria-label={PANE_NAMES[index + 3]}
            className="w-full"
          >
            {child}
          </section>
        ))}

        {/* Row 3: Pane 6 (Summary) — full width */}
        <section
          id="pane-6"
          aria-label={PANE_NAMES[6]}
          className="col-span-3 w-full"
        >
          {children[6]}
        </section>
      </div>
    </>
  );
}
