"use client";

import { type CSSProperties, type RefObject, useLayoutEffect, useRef } from "react";

import { Backdrop } from "./backdrop";

// A section slide names a part of the service, with an optional line of direction under
// it. It stands on the same backdrop as the cover and wears the same colors: the title in
// navy running into blue, a short rule in blue running into green, the direction in a
// neutral dark. When it is live the three come in one after the other.

const cqw = (value: number) => `${value}cqw`;

export const ENTER_MS = 520;
// How long after the title the rule starts, and after the rule the direction.
export const STAGGER_MS = 130;

// A quick start and a long, slow arrival.
const GLIDE = "cubic-bezier(0.25, 1, 0.5, 1)";

export const TITLE_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: `translateY(${cqw(1.6)})` },
  { opacity: 1, transform: "translateY(0cqw)" },
];
// The rule grows out from its middle.
export const RULE_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "scaleX(0)" },
  { opacity: 1, transform: "scaleX(1)" },
];
export const DIRECTION_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: `translateY(${cqw(1)})` },
  { opacity: 1, transform: "translateY(0cqw)" },
];

// The text stands in the middle of the space above the water.
const TEXT_STYLE: CSSProperties = { padding: `0 ${cqw(9)} ${cqw(9)}`, gap: cqw(2.2) };
const TITLE_STYLE: CSSProperties = {
  fontSize: cqw(6.4),
  color: "transparent",
  backgroundImage: "linear-gradient(90deg, #0a1f5c, #1d4ed8)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
};
const RULE_STYLE: CSSProperties = {
  width: cqw(9),
  height: cqw(0.55),
  backgroundImage: "linear-gradient(90deg, #1d4ed8, #0f766e)",
};
const DIRECTION_STYLE: CSSProperties = { fontSize: cqw(3.1), maxWidth: cqw(74), color: "#1e293b" };

export function Section({ title, subtitle, live }: { title?: string; subtitle?: string; live: boolean }) {
  const heading = useRef<HTMLParagraphElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const direction = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (!live) return;

    const parts: [RefObject<HTMLElement | null>, Keyframe[]][] = [
      [heading, TITLE_KEYFRAMES],
      [rule, RULE_KEYFRAMES],
      [direction, DIRECTION_KEYFRAMES],
    ];
    // Without the Web Animations API the slide simply shows.
    const running = parts
      .filter(([part]) => part.current && typeof part.current.animate === "function")
      .map(([part, keyframes], index) =>
        // Held at its first frame until its turn comes.
        part.current!.animate(keyframes, { duration: ENTER_MS, delay: index * STAGGER_MS, easing: GLIDE, fill: "backwards" }),
      );

    return () => {
      for (const animation of running) animation.cancel();
    };
  }, [live]);

  return (
    <div className="relative h-full">
      <Backdrop live={live} />

      <div className="relative flex h-full flex-col items-center justify-center text-center" style={TEXT_STYLE}>
        <p ref={heading} className="leading-[1.1] font-bold text-balance" style={TITLE_STYLE}>
          {title}
        </p>
        <span ref={rule} aria-hidden className="rounded-full" style={RULE_STYLE} />
        {subtitle && (
          <p ref={direction} className="leading-snug font-medium text-balance" style={DIRECTION_STYLE}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
