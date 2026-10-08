"use client";

import { PanelLeftClose } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { FrameView } from "@/features/templates/frame-view";
import type { Church, Frame } from "@/features/templates/types";

// The panel of slide thumbnails on the left of the stage. It scrolls on its own, keeps
// the selected slide in view and can be closed to give the stage the full width.
export function Filmstrip({
  church,
  frames,
  selected,
  onSelect,
  onClose,
}: {
  church: Church;
  // The first frame of every slide, in order.
  frames: Frame[];
  selected: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Editor");
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView?.({ block: "nearest" });
  }, [selected]);

  return (
    <nav aria-label={t("filmstrip")} className="flex w-52 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border pr-1 pl-3">
        <p className="text-xs font-medium text-muted">{t("filmstrip")}</p>
        <button
          type="button"
          aria-label={t("hidePanel")}
          title={t("hidePanel")}
          className="inline-flex size-7 items-center justify-center rounded hover:bg-black/5"
          onClick={onClose}
        >
          <PanelLeftClose aria-hidden className="size-4" />
        </button>
      </div>

      <ol ref={list} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {frames.map((frame, index) => (
          <li key={frame.slide.id}>
            <button
              type="button"
              aria-label={t("goTo", { number: index + 1, kind: t(`kinds.${frame.slide.kind}`) })}
              aria-current={index === selected ? "true" : undefined}
              className="group flex w-full items-start gap-2 text-left"
              onClick={() => onSelect(index)}
            >
              <span className="w-5 shrink-0 pt-0.5 text-right text-xs text-muted group-aria-[current]:font-semibold group-aria-[current]:text-foreground">
                {index + 1}
              </span>
              <span className="block min-w-0 flex-1 overflow-hidden rounded border border-border group-hover:border-accent group-aria-[current]:border-accent group-aria-[current]:ring-2 group-aria-[current]:ring-accent">
                <FrameView frame={frame} church={church} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
