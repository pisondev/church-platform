"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef } from "react";

// The cover as a bumper: a short motion piece that repeats for as long as the slide is
// shown. It runs on the Web Animations API, so it does not depend on a stylesheet. It is
// content, like a video, and plays even when the system asks for reduced motion.

// One round: the logo arrives, rests, fades out, and the frame stays empty for a moment.
export const LOOP_MS = 8000;
const RISE_MS = 1100;
const SETTLE_MS = 500;
const FADE_AT_MS = 7000;
const FADE_MS = 500;

const at = (ms: number) => ms / LOOP_MS;

// Leaves fast and keeps losing speed up to the top of its path. It still moves near the
// top, so passing the center reads as a bounce and not as a pause.
const LAUNCH = "cubic-bezier(0.15, 0.7, 0.7, 1)";
// Starts and ends at rest: the short fall back onto the center.
const SOFT = "cubic-bezier(0.37, 0, 0.63, 1)";
// Fast, then slower and slower: most of the turning is over before the center.
const FAST_OUT = "cubic-bezier(0.33, 1, 0.68, 1)";

// Distances are a share of the frame height. The logo starts just below the frame, rises
// past the center, then sinks back onto it: a small bounce.
export const LIFT_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: "translateY(80%)", opacity: 1, easing: LAUNCH },
  { offset: at(RISE_MS), transform: "translateY(-5%)", opacity: 1, easing: SOFT },
  { offset: at(RISE_MS + SETTLE_MS), transform: "translateY(0%)", opacity: 1 },
  { offset: at(FADE_AT_MS), transform: "translateY(0%)", opacity: 1, easing: "ease-in" },
  { offset: at(FADE_AT_MS + FADE_MS), transform: "translateY(0%)", opacity: 0 },
  { offset: 1, transform: "translateY(0%)", opacity: 0 },
];

// On the way up the logo turns around its vertical axis, like a coin standing on its edge,
// and faces front when it reaches the top.
export const SPIN_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: "rotateY(-720deg)", easing: FAST_OUT },
  { offset: at(RISE_MS), transform: "rotateY(0deg)" },
  { offset: 1, transform: "rotateY(0deg)" },
];

// The perspective travels with the logo, so the turn looks the same at every height. The
// shadow is cast by what is visible of the logo, so it narrows as the logo turns.
const LIFT_STYLE = {
  perspective: "80cqw",
  filter: "drop-shadow(0 1.1cqw 0.9cqw rgb(15 23 42 / 0.38))",
} as const;

export function Bumper({ logo, church, live }: { logo: string; church: string; live: boolean }) {
  const t = useTranslations("Templates");
  const lift = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const frame = lift.current;
    const image = spin.current;
    // Without the Web Animations API the logo stays where it rests.
    if (!live || !frame || !image || typeof image.animate !== "function") return;

    let running: Animation[] = [];
    const play = () => {
      const timing = { duration: LOOP_MS, iterations: Infinity };
      running = [frame.animate(LIFT_KEYFRAMES, timing), image.animate(SPIN_KEYFRAMES, timing)];
    };

    // Wait for the picture, or the first round would pass with nothing to show.
    if (image.complete) play();
    else image.addEventListener("load", play, { once: true });

    return () => {
      image.removeEventListener("load", play);
      for (const animation of running) animation.cancel();
    };
  }, [live, logo]);

  return (
    <div ref={lift} className="flex h-full items-center justify-center" style={LIFT_STYLE}>
      {/* A plain img: the file is already sized for the slide, and the animation needs the element. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={spin}
        src={logo}
        alt={t("logo", { church })}
        draggable={false}
        className="w-[30cqw] select-none"
      />
    </div>
  );
}
