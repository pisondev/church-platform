"use client";

import { ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { SlideView } from "./slide-view";
import type { SongSlide } from "./types";

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown", " "]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

// Form fields keep their keys, and Space on a focused button already clicks it.
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.tagName === "BUTTON" && key === " ";
}

// Shows one slide at a time, with keyboard, click and full-screen controls.
export function Slideshow({ slides }: { slides: SongSlide[] }) {
  const t = useTranslations("Slideshow");
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const last = slides.length - 1;
  const current = Math.min(index, last);

  const go = useCallback(
    (target: number) => setIndex(Math.max(0, Math.min(last, target))),
    [last],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ownsKey(event.target, event.key)) return;

      if (NEXT_KEYS.has(event.key)) go(current + 1);
      else if (PREVIOUS_KEYS.has(event.key)) go(current - 1);
      else if (event.key === "Home") go(0);
      else if (event.key === "End") go(last);
      else return;

      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, go, last]);

  const controlClass =
    "inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-surface disabled:opacity-40";

  return (
    <section aria-label={t("label")}>
      <div
        ref={stage}
        className="slide-stage cursor-pointer overflow-hidden rounded-lg border border-border"
        onClick={() => go(current + 1)}
      >
        <SlideView slide={slides[current]} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={controlClass}
          aria-label={t("previous")}
          disabled={current === 0}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p aria-live="polite" className="min-w-28 text-center text-sm text-muted tabular-nums">
          {t("position", { current: current + 1, total: slides.length })}
        </p>
        <button
          type="button"
          className={controlClass}
          aria-label={t("next")}
          disabled={current === last}
          onClick={() => go(current + 1)}
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          onClick={() => stage.current?.requestFullscreen?.()}
        >
          <Maximize aria-hidden className="size-4" />
          {t("present")}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{t("hint")}</p>

      <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slides.map((slide, position) => (
          <li key={position}>
            <button
              type="button"
              aria-label={t("goTo", { number: position + 1 })}
              aria-current={position === current ? "true" : undefined}
              className="block w-full overflow-hidden rounded-md border border-border aria-[current]:ring-2 aria-[current]:ring-accent"
              onClick={() => go(position)}
            >
              <SlideView slide={slide} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
