"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type WheelEvent } from "react";

import { FrameView } from "@/features/templates/frame-view";
import type { Frame } from "@/features/templates/types";

// The row of slide thumbnails under the stage. It scrolls sideways, also with a plain
// mouse wheel, and keeps the selected slide in view.
export function Filmstrip({
  frames,
  selected,
  onSelect,
}: {
  // The first frame of every slide, in order.
  frames: Frame[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("Editor");
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }, [selected]);

  const onWheel = (event: WheelEvent<HTMLOListElement>) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.currentTarget.scrollLeft += event.deltaY;
    }
  };

  return (
    <nav aria-label={t("filmstrip")} className="border-t border-border bg-surface">
      <ol ref={list} className="flex gap-3 overflow-x-auto px-4 py-3" onWheel={onWheel}>
        {frames.map((frame, index) => (
          <li key={frame.slide.id} className="shrink-0">
            <button
              type="button"
              aria-label={t("goTo", { number: index + 1, kind: t(`kinds.${frame.slide.kind}`) })}
              aria-current={index === selected ? "true" : undefined}
              className="group block w-36 text-left"
              onClick={() => onSelect(index)}
            >
              <span className="block overflow-hidden rounded border border-border group-hover:border-accent group-aria-[current]:border-accent group-aria-[current]:ring-2 group-aria-[current]:ring-accent">
                <FrameView frame={frame} />
              </span>
              <span className="mt-1 block text-xs text-muted group-aria-[current]:font-semibold group-aria-[current]:text-foreground">
                {index + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
