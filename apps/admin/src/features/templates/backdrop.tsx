"use client";

import { type CSSProperties, useLayoutEffect, useRef } from "react";

// What lies behind the bumper: a bright, mostly white frame with a breath of sky at the
// top and slow waves of light blue along the bottom. It keeps moving on its own, and does
// not start over when the bumper in front of it does. Like the bumper it runs on the Web
// Animations API and is content, not interface motion.

const cqw = (value: number) => `${value}cqw`;

type Wave = {
  // In cqw, a share of the frame width.
  height: number;
  color: string;
  // The time it takes to travel the width of the frame.
  seconds: number;
  reverse: boolean;
  // Where in its travel it starts, 0 to 1, so the waves are not lined up.
  start: number;
  path: string;
};

// From the back to the front. Every path repeats after 600 of its 1200 units.
export const WAVES: Wave[] = [
  {
    height: 17,
    color: "rgb(219 234 254 / 0.85)",
    seconds: 46,
    reverse: false,
    start: 0,
    path: "M0 50 C150 5 450 95 600 50 C750 5 1050 95 1200 50 V100 H0 Z",
  },
  {
    height: 13,
    color: "rgb(191 219 254 / 0.6)",
    seconds: 31,
    reverse: true,
    start: 0.35,
    path: "M0 50 C75 22 225 78 300 50 C375 22 525 78 600 50 C675 22 825 78 900 50 C975 22 1125 78 1200 50 V100 H0 Z",
  },
  {
    height: 9,
    color: "rgb(147 197 253 / 0.42)",
    seconds: 23,
    reverse: false,
    start: 0.7,
    path: "M0 55 C200 12 400 98 600 55 C800 12 1000 98 1200 55 V100 H0 Z",
  },
];

// A wave is drawn twice as wide as the frame and repeats halfway, so moving it by half its
// width ends on the picture it started with.
export const DRIFT_KEYFRAMES: Keyframe[] = [{ transform: "translateX(0%)" }, { transform: "translateX(-50%)" }];

const SKY_STYLE: CSSProperties = {
  background: [
    "radial-gradient(ellipse 85% 75% at 50% -20%, rgb(219 234 254 / 0.75), transparent 70%)",
    "linear-gradient(180deg, #ffffff 50%, #f3f8ff)",
  ].join(", "),
};

export function Backdrop({ live }: { live: boolean }) {
  const waves = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!live) return;

    const running = waves.current.flatMap((wave, index) => {
      // Without the Web Animations API the waves stand still.
      if (!wave || typeof wave.animate !== "function") return [];
      const { seconds, reverse, start } = WAVES[index];
      return [
        wave.animate(DRIFT_KEYFRAMES, {
          duration: seconds * 1000,
          iterations: Infinity,
          direction: reverse ? "reverse" : "normal",
          iterationStart: start,
        }),
      ];
    });

    return () => {
      for (const animation of running) animation.cancel();
    };
  }, [live]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={SKY_STYLE}>
      {WAVES.map((wave, index) => (
        <div
          key={wave.path}
          ref={(element) => {
            waves.current[index] = element;
          }}
          className="absolute bottom-0 left-0 w-[200%]"
          style={{ height: cqw(wave.height), color: wave.color }}
        >
          <svg viewBox="0 0 1200 100" preserveAspectRatio="none" className="block size-full">
            <path fill="currentColor" d={wave.path} />
          </svg>
        </div>
      ))}
    </div>
  );
}
