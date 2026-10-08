"use client";

import { type CSSProperties, type RefObject, useLayoutEffect, useRef } from "react";

// What lies behind the bumper: a bright, mostly white frame. From the back to the front:
// a breath of sky, a kawung batik pattern in the top corners, slow waves of light blue
// along the bottom, and motes of light drifting up. It keeps moving on its own and does
// not start over when the bumper in front of it does. Like the bumper it runs on the Web
// Animations API and is content, not interface motion.

const cqw = (value: number) => `${value}cqw`;

const SKY_STYLE: CSSProperties = {
  background: [
    "radial-gradient(ellipse 85% 75% at 50% -20%, rgb(219 234 254 / 0.75), transparent 70%)",
    "linear-gradient(180deg, #ffffff 50%, #f3f8ff)",
  ].join(", "),
};

// One tile of kawung: four petals around a point, the Javanese pattern of the sugar palm
// fruit. The tiles show in the two top corners and fade out toward the middle.
export const KAWUNG_TILE = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#3b82f6" stroke-width="2.4">',
  '<ellipse cx="25" cy="25" rx="30" ry="13" transform="rotate(45 25 25)"/>',
  '<ellipse cx="75" cy="75" rx="30" ry="13" transform="rotate(45 75 75)"/>',
  '<ellipse cx="75" cy="25" rx="30" ry="13" transform="rotate(-45 75 25)"/>',
  '<ellipse cx="25" cy="75" rx="30" ry="13" transform="rotate(-45 25 75)"/>',
  '<g fill="#3b82f6" stroke="none">',
  '<circle cx="25" cy="25" r="3"/><circle cx="75" cy="25" r="3"/>',
  '<circle cx="25" cy="75" r="3"/><circle cx="75" cy="75" r="3"/>',
  '<circle cx="50" cy="50" r="2.2"/>',
  "</g></svg>",
].join("");
const BATIK_MASK = [
  "radial-gradient(ellipse 46% 80% at 0% 0%, #000 0%, transparent 72%)",
  "radial-gradient(ellipse 46% 80% at 100% 0%, #000 0%, transparent 72%)",
].join(", ");
const BATIK_STYLE: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(KAWUNG_TILE)}")`,
  backgroundSize: `${cqw(6.5)} ${cqw(6.5)}`,
  opacity: 0.42,
  maskImage: BATIK_MASK,
  WebkitMaskImage: BATIK_MASK,
};

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
    height: 15,
    color: "rgb(219 234 254 / 0.85)",
    seconds: 46,
    reverse: false,
    start: 0,
    path: "M0 50 C150 5 450 95 600 50 C750 5 1050 95 1200 50 V100 H0 Z",
  },
  {
    height: 12,
    color: "rgb(191 219 254 / 0.6)",
    seconds: 31,
    reverse: true,
    start: 0.35,
    path: "M0 50 C75 22 225 78 300 50 C375 22 525 78 600 50 C675 22 825 78 900 50 C975 22 1125 78 1200 50 V100 H0 Z",
  },
  {
    height: 8.5,
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

// The water can be lifted, by the band that rises at the bottom of the bumper. Under each
// wave there is this much more water, out of the frame until then.
export const WATER_DEPTH = 14;
const DEEP_STYLE: CSSProperties = { height: cqw(WATER_DEPTH), background: "currentColor" };

type Mote = {
  // Where it starts: a share of the frame width, and cqw from the top.
  x: number;
  y: number;
  // In cqw.
  size: number;
  // How far it leans sideways on its way up, in cqw.
  sway: number;
  seconds: number;
  start: number;
};

// Fixed, so every screen shows the same sky. Fewer in the middle, where the text is.
export const MOTES: Mote[] = [
  { x: 4, y: 30, size: 2.6, sway: 2.5, seconds: 19, start: 0.1 },
  { x: 9, y: 46, size: 1.6, sway: -1.5, seconds: 15, start: 0.55 },
  { x: 16, y: 22, size: 3.6, sway: 3, seconds: 24, start: 0.8 },
  { x: 23, y: 50, size: 2.1, sway: 2, seconds: 17, start: 0.3 },
  { x: 31, y: 40, size: 1.4, sway: -2, seconds: 14, start: 0.65 },
  { x: 40, y: 52, size: 2.8, sway: 1.5, seconds: 21, start: 0.2 },
  { x: 50, y: 18, size: 1.8, sway: -2.5, seconds: 18, start: 0.9 },
  { x: 58, y: 50, size: 2.2, sway: 2.5, seconds: 16, start: 0.45 },
  { x: 67, y: 42, size: 1.5, sway: -1.5, seconds: 15, start: 0.05 },
  { x: 75, y: 24, size: 3.2, sway: -3, seconds: 23, start: 0.6 },
  { x: 82, y: 48, size: 2, sway: 2, seconds: 17, start: 0.35 },
  { x: 89, y: 34, size: 2.9, sway: -2.5, seconds: 20, start: 0.75 },
  { x: 95, y: 50, size: 1.7, sway: 1.5, seconds: 14, start: 0.25 },
  { x: 97, y: 16, size: 2.3, sway: -2, seconds: 22, start: 0.5 },
];

// How far a mote rises in one pass, in cqw.
const MOTE_RISE = 16;
// How strong a mote is at its brightest, and when it stands still.
const MOTE_GLOW = 0.9;

// A mote comes out of nothing, drifts up while leaning to one side, and goes out again.
export function moteKeyframes(mote: Mote): Keyframe[] {
  return [
    { offset: 0, opacity: 0, transform: "translate(0cqw, 0cqw)" },
    { offset: 0.25, opacity: MOTE_GLOW },
    { offset: 0.7, opacity: MOTE_GLOW },
    { offset: 1, opacity: 0, transform: `translate(${cqw(mote.sway)}, ${cqw(-MOTE_RISE)})` },
  ];
}

// A bright core in a soft blue halo: on a white frame light has to carry a little color.
const MOTE_FILL =
  "radial-gradient(circle, #ffffff 0%, rgb(147 197 253 / 0.9) 26%, rgb(191 219 254 / 0.4) 48%, rgb(191 219 254 / 0) 72%)";

export function Backdrop({
  live,
  lift = 0,
  water,
}: {
  live: boolean;
  // How far the water stands above the bottom when the backdrop is still, in cqw.
  lift?: number;
  // Handed to the water, so that the bumper can raise it in time with its band.
  water?: RefObject<HTMLDivElement | null>;
}) {
  const waves = useRef<(HTMLDivElement | null)[]>([]);
  const motes = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!live) return;

    // Without the Web Animations API the backdrop stands still.
    const play = (element: HTMLElement | null, keyframes: Keyframe[], seconds: number, extra: KeyframeEffectOptions) =>
      element && typeof element.animate === "function"
        ? [element.animate(keyframes, { duration: seconds * 1000, iterations: Infinity, ...extra })]
        : [];

    const running = [
      ...waves.current.flatMap((wave, index) => {
        const { seconds, reverse, start } = WAVES[index];
        return play(wave, DRIFT_KEYFRAMES, seconds, { direction: reverse ? "reverse" : "normal", iterationStart: start });
      }),
      ...motes.current.flatMap((mote, index) => {
        const { seconds, start } = MOTES[index];
        return play(mote, moteKeyframes(MOTES[index]), seconds, { iterationStart: start });
      }),
    ];

    return () => {
      for (const animation of running) animation.cancel();
    };
  }, [live]);

  // A still backdrop shows the water where the bumper leaves it.
  const waterStyle = !live && lift > 0 ? { transform: `translateY(${cqw(-lift)})` } : undefined;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={SKY_STYLE}>
      <div data-layer="batik" className="absolute inset-0" style={BATIK_STYLE} />

      <div ref={water} data-layer="water" className="absolute inset-0" style={waterStyle}>
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
            <div className="absolute inset-x-0 top-full" style={DEEP_STYLE} />
          </div>
        ))}
      </div>

      {MOTES.map((mote, index) => (
        <span
          key={index}
          ref={(element) => {
            motes.current[index] = element;
          }}
          data-layer="mote"
          className="absolute rounded-full"
          style={{
            left: `${mote.x}%`,
            top: cqw(mote.y),
            width: cqw(mote.size),
            height: cqw(mote.size),
            background: MOTE_FILL,
            opacity: MOTE_GLOW,
          }}
        />
      ))}
    </div>
  );
}
