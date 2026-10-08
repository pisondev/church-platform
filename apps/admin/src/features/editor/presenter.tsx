"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);

// As large as the screen allows at 16:9. Inline, so it never depends on a stylesheet.
const FRAME_STYLE = { width: "min(100vw, calc(100vh * 16 / 9))" } as const;

// The default change between frames: the one on screen fades out quickly, then the next
// one fades in. It runs on the Web Animations API; without it frames change at once.
export const FADE_OUT_MS = 160;
export const FADE_IN_MS = 280;

// Shows frames one at a time over the whole screen. It asks the browser for full screen
// and still covers the page when that is refused. Escape, or leaving full screen, closes it.
export function Presenter({
  label,
  frames,
  start,
  onClose,
}: {
  label: string;
  frames: ReactNode[];
  start: number;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const entering = useRef<Animation | null>(null);
  // Where the slideshow is, and the frame that is on screen. They differ only while the
  // frame on screen fades out.
  const [index, setIndex] = useState(start);
  const [shown, setShown] = useState(start);
  const target = useRef(start);
  const last = frames.length - 1;

  const canFade = typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.animate === "function";
  const leaving = canFade && index !== shown;

  useEffect(() => {
    target.current = index;
  }, [index]);

  // The frame on screen fades out. The frame that takes its place is the one the slideshow
  // has reached by then, so quick steps do not show every frame in between.
  useEffect(() => {
    const element = stage.current;
    if (!leaving || !element) return;

    const from = getComputedStyle(element).opacity || "1";
    entering.current?.cancel();
    const fade = element.animate([{ opacity: from }, { opacity: 0 }], {
      duration: FADE_OUT_MS,
      easing: "ease-in",
      fill: "forwards",
    });
    fade.onfinish = () => setShown(target.current);

    return () => fade.cancel();
  }, [leaving]);

  // A new frame fades in, the first one included. This starts before the frame is painted,
  // so the frame never flashes at full strength first.
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element || typeof element.animate !== "function") return;

    entering.current = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN_MS, easing: "ease-out" });
  }, [shown]);

  useEffect(() => {
    const element = root.current;
    let entered = false;

    const onFullscreenChange = () => {
      if (document.fullscreenElement === element) entered = true;
      else if (entered) onClose();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    element?.requestFullscreen?.().catch(() => undefined);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement === element) document.exitFullscreen?.().catch(() => undefined);
    };
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (NEXT_KEYS.has(event.key)) setIndex((current) => Math.min(last, current + 1));
      else if (PREVIOUS_KEYS.has(event.key)) setIndex((current) => Math.max(0, current - 1));
      else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(last);
      else return;

      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [last, onClose]);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-white"
      onClick={() => setIndex((current) => Math.min(last, current + 1))}
    >
      <div ref={stage} style={FRAME_STYLE}>
        {frames[canFade ? shown : index]}
      </div>
    </div>
  );
}
