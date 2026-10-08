"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp", "Backspace"]);

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
  const [index, setIndex] = useState(start);
  const last = frames.length - 1;

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
      <div className="present-frame">{frames[index]}</div>
    </div>
  );
}
