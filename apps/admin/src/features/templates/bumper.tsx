"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, type RefObject, useLayoutEffect, useRef } from "react";

// The cover as a bumper: a short motion piece that repeats for as long as the slide is
// shown. It runs on the Web Animations API, so it does not depend on a stylesheet. It is
// content, like a video, and plays even when the system asks for reduced motion.
//
// One round:
//   1. The logo comes up from below the frame, flipping, passes the center and settles.
//   2. It glides to the left, shrinking a little, and uncovers the title, which comes
//      out from behind it.
//   3. The date line appears under the title, moving in from the left.
//   4. With a notice: everything moves up and the notice fades in below, on glass.
//   5. Everything rests, fades out, and the frame is empty for a moment.

export const LOOP_MS = 14000;
const RISE_MS = 1100;
const SETTLE_MS = 500;
const SLIDE_AT_MS = 1900;
const SLIDE_MS = 1100;
const DATE_AT_MS = 3100;
const DATE_MS = 700;
const RAISE_AT_MS = 4000;
const RAISE_MS = 900;
const NOTICE_AT_MS = 4700;
const NOTICE_MS = 800;
const FADE_AT_MS = 13000;
const FADE_MS = 500;

const at = (ms: number) => ms / LOOP_MS;

// Sizes are in cqw, a share of the frame width. A 16:9 frame is 56.25cqw high.
const FRAME_HEIGHT = 56.25;
// The logo as it rests beside the text. It arrives larger and shrinks on its way left.
const LOGO_SIZE = 24;
const LOGO_ARRIVAL_SCALE = 1.25;
const GAP = 2.5;
const TITLE_SIZE = 5.2;
// The title and the date line are sized by the golden ratio.
const PHI = (1 + Math.sqrt(5)) / 2;
const DATE_SIZE = TITLE_SIZE / PHI;
// Room kept under the logo and the text for the notice. They move up by half of it.
const NOTICE_ROOM = 12;

const cqw = (value: number) => `${value}cqw`;

// Leaves fast and keeps losing speed up to the top of its path. It still moves near the
// top, so passing the center reads as a bounce and not as a pause.
const LAUNCH = "cubic-bezier(0.15, 0.7, 0.7, 1)";
// Starts and ends at rest: the short fall back onto the center.
const SOFT = "cubic-bezier(0.37, 0, 0.63, 1)";
// Fast, then slower and slower: most of the turning is over before the center.
const FAST_OUT = "cubic-bezier(0.33, 1, 0.68, 1)";
// A quick start and a long, slow arrival, for everything that glides into place.
const GLIDE = "cubic-bezier(0.25, 1, 0.5, 1)";

// Vertical travel as a share of the frame height. The logo starts just below the frame,
// rises past the center, then sinks back onto it: a small bounce.
const up = (share: number) => `translateY(${cqw(share * FRAME_HEIGHT)})`;
export const LIFT_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: up(0.8), easing: LAUNCH },
  { offset: at(RISE_MS), transform: up(-0.05), easing: SOFT },
  { offset: at(RISE_MS + SETTLE_MS), transform: up(0) },
  { offset: 1, transform: up(0) },
];

// On the way up the logo flips three times around its vertical axis, like a coin standing
// on its edge. It starts on its back, so the third flip leaves it facing front. It keeps
// its arrival size until it glides left.
const turned = (degrees: number, scale: number) => `rotateY(${degrees}deg) scale(${scale})`;
export const SPIN_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: turned(-540, LOGO_ARRIVAL_SCALE), easing: FAST_OUT },
  { offset: at(RISE_MS), transform: turned(0, LOGO_ARRIVAL_SCALE) },
  { offset: at(SLIDE_AT_MS), transform: turned(0, LOGO_ARRIVAL_SCALE), easing: GLIDE },
  { offset: at(SLIDE_AT_MS + SLIDE_MS), transform: turned(0, 1) },
  { offset: 1, transform: turned(0, 1) },
];

// The logo and the text rest side by side, centered as one group. Moving the group right
// by half the width of its text puts the logo in the middle of the frame; that is where
// it lands, and from there it glides to its place. With a notice the group also starts
// lower, in the middle of the frame, and moves up once the text is complete.
export function lockupKeyframes(withNotice: boolean): Keyframe[] {
  const low = withNotice ? cqw(NOTICE_ROOM / 2) : "0cqw";
  const centered = `translate(50%, ${low})`;
  const beside = `translate(0%, ${low})`;
  const raised = "translate(0%, 0cqw)";

  return [
    { offset: 0, transform: centered },
    { offset: at(SLIDE_AT_MS), transform: centered, easing: GLIDE },
    { offset: at(SLIDE_AT_MS + SLIDE_MS), transform: beside },
    { offset: at(RAISE_AT_MS), transform: beside, easing: GLIDE },
    { offset: at(RAISE_AT_MS + RAISE_MS), transform: raised },
    { offset: 1, transform: raised },
  ];
}

// The title waits out of sight behind the edge of the logo, and comes out as that edge
// moves away from it.
const TITLE_HIDDEN = `translateX(calc(-100% - ${cqw(GAP)}))`;
export const TITLE_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: TITLE_HIDDEN },
  { offset: at(SLIDE_AT_MS), transform: TITLE_HIDDEN, easing: GLIDE },
  { offset: at(SLIDE_AT_MS + SLIDE_MS), transform: "translateX(0%)" },
  { offset: 1, transform: "translateX(0%)" },
];

// The date line comes out of nothing once the title is in place, moving right.
const DATE_AWAY = `translateX(${cqw(-4)})`;
export const DATE_KEYFRAMES: Keyframe[] = [
  { offset: 0, opacity: 0, transform: DATE_AWAY },
  { offset: at(DATE_AT_MS), opacity: 0, transform: DATE_AWAY, easing: GLIDE },
  { offset: at(DATE_AT_MS + DATE_MS), opacity: 1, transform: "translateX(0cqw)" },
  { offset: 1, opacity: 1, transform: "translateX(0cqw)" },
];

// The notice only fades in, as the room for it opens.
export const NOTICE_KEYFRAMES: Keyframe[] = [
  { offset: 0, opacity: 0 },
  { offset: at(NOTICE_AT_MS), opacity: 0, easing: "ease-out" },
  { offset: at(NOTICE_AT_MS + NOTICE_MS), opacity: 1 },
  { offset: 1, opacity: 1 },
];

// Each round ends on an empty frame, so the next one starts clean.
export const SCENE_KEYFRAMES: Keyframe[] = [
  { offset: 0, opacity: 1 },
  { offset: at(FADE_AT_MS), opacity: 1, easing: "ease-in" },
  { offset: at(FADE_AT_MS + FADE_MS), opacity: 0 },
  { offset: 1, opacity: 0 },
];

// The group leaves room for the logo on its left and is as wide as its text.
const LOCKUP_STYLE: CSSProperties = { marginLeft: cqw(LOGO_SIZE), height: cqw(LOGO_SIZE) };

// The perspective travels with the logo, so the turn looks the same at every height. The
// shadow is cast by what is visible of the logo, so it narrows as the logo turns.
const LIFT_STYLE: CSSProperties = {
  width: cqw(LOGO_SIZE),
  perspective: "80cqw",
  filter: "drop-shadow(0 1.1cqw 0.9cqw rgb(15 23 42 / 0.38))",
};

// The text shows through a window that starts at the edge of the logo. The edge is soft:
// what comes out from behind the logo fades in over the width of the gap.
const WINDOW_MASK = `linear-gradient(90deg, transparent, #000 ${cqw(GAP)})`;
const WINDOW_STYLE: CSSProperties = { maskImage: WINDOW_MASK, WebkitMaskImage: WINDOW_MASK };
const TEXT_STYLE: CSSProperties = { paddingLeft: cqw(GAP) };

// Dark on white for a weak projector: navy into blue for the title, deep green into teal
// for the date line.
const gradientText = (from: string, to: string, size: number): CSSProperties => ({
  fontSize: cqw(size),
  color: "transparent",
  backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
});
const TITLE_STYLE = gradientText("#0a1f5c", "#1d4ed8", TITLE_SIZE);
const DATE_STYLE = gradientText("#064e3b", "#0f766e", DATE_SIZE);

// The notice sits on frosted glass: a rounded sheet that blurs what is behind it. On a
// plain white frame there is nothing to blur, so a soft glow in the two text colors lies
// under the glass and gives it something to show.
const NOTICE_ROOM_STYLE: CSSProperties = { height: cqw(NOTICE_ROOM) };
const GLOW_STYLE: CSSProperties = {
  inset: `${cqw(0.6)} ${cqw(4)}`,
  borderRadius: cqw(3),
  background: "linear-gradient(90deg, rgb(29 78 216 / 0.55), rgb(15 118 110 / 0.55))",
  filter: `blur(${cqw(1.6)})`,
};
const GLASS_BLUR = `blur(${cqw(1.4)})`;
const GLASS_STYLE: CSSProperties = {
  maxWidth: cqw(76),
  padding: `${cqw(1.3)} ${cqw(3.2)}`,
  borderRadius: cqw(1.6),
  fontSize: cqw(2.5),
  color: "#0a1f5c",
  background: "linear-gradient(135deg, rgb(255 255 255 / 0.82), rgb(255 255 255 / 0.62))",
  border: `${cqw(0.12)} solid rgb(255 255 255 / 0.9)`,
  boxShadow: `0 ${cqw(0.6)} ${cqw(2)} rgb(15 23 42 / 0.16)`,
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR,
};

export function Bumper({
  logo,
  church,
  title,
  date,
  notice,
  live,
}: {
  logo: string;
  church: string;
  title?: string;
  date: string;
  notice?: string;
  live: boolean;
}) {
  const t = useTranslations("Templates");
  const withNotice = Boolean(notice);

  const scene = useRef<HTMLDivElement>(null);
  const lockup = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLImageElement>(null);
  const heading = useRef<HTMLParagraphElement>(null);
  const dateLine = useRef<HTMLParagraphElement>(null);
  const warning = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = scene.current;
    const image = spin.current;
    // Without the Web Animations API the bumper stays as it rests.
    if (!live || !frame || !image || typeof image.animate !== "function") return;

    const parts: [RefObject<HTMLElement | null>, Keyframe[]][] = [
      [scene, SCENE_KEYFRAMES],
      [lockup, lockupKeyframes(withNotice)],
      [lift, LIFT_KEYFRAMES],
      [spin, SPIN_KEYFRAMES],
      [heading, TITLE_KEYFRAMES],
      [dateLine, DATE_KEYFRAMES],
      [warning, NOTICE_KEYFRAMES],
    ];
    let running: Animation[] = [];
    const show = () => {
      frame.style.visibility = "";
    };
    const play = () => {
      const timing = { duration: LOOP_MS, iterations: Infinity };
      running = parts.flatMap(([part, keyframes]) => (part.current ? [part.current.animate(keyframes, timing)] : []));
      show();
    };

    if (image.complete) {
      play();
    } else {
      // A round starts on an empty frame, so the frame stays empty until the logo is there.
      // If it never arrives, the bumper shows as it rests.
      frame.style.visibility = "hidden";
      image.addEventListener("load", play, { once: true });
      image.addEventListener("error", show, { once: true });
    }

    return () => {
      image.removeEventListener("load", play);
      image.removeEventListener("error", show);
      for (const animation of running) animation.cancel();
      show();
    };
  }, [live, logo, withNotice]);

  return (
    <div ref={scene} className="flex h-full flex-col items-center justify-center">
      <div ref={lockup} className="relative" style={LOCKUP_STYLE}>
        <div ref={lift} className="absolute inset-y-0 right-full flex items-center" style={LIFT_STYLE}>
          {/* A plain img: the file is already sized for the slide, and the animation needs the element. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={spin} src={logo} alt={t("logo", { church })} draggable={false} className="w-full select-none" />
        </div>

        <div className="flex h-full items-center overflow-hidden" style={WINDOW_STYLE}>
          <div style={TEXT_STYLE}>
            {title && (
              <p
                ref={heading}
                className="w-fit max-w-[60cqw] leading-[1.15] font-bold text-balance"
                style={TITLE_STYLE}
              >
                {title}
              </p>
            )}
            <p
              ref={dateLine}
              className="mt-[0.6cqw] w-fit leading-snug font-semibold whitespace-nowrap"
              style={DATE_STYLE}
            >
              {date}
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="flex items-end" style={NOTICE_ROOM_STYLE}>
          <div ref={warning} className="relative">
            <div aria-hidden className="absolute" style={GLOW_STYLE} />
            <p className="relative text-center leading-snug font-semibold text-balance" style={GLASS_STYLE}>
              {notice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
