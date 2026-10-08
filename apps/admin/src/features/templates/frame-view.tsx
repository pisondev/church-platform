"use client";

import { BookOpen, Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { SongSlideBody } from "@/features/songs/slide-view";

import { Backdrop } from "./backdrop";
import { BAND_HEIGHT, Bumper } from "./bumper";
import { churchLogos } from "./church-logo";
import { emphasize } from "./emphasis";
import { Section } from "./section";
import { coverTitle, serviceDateLine, upcomingSunday } from "./service-date";
import type { Church, Frame, ReadingLine, TemplateSlide } from "./types";

// Slide text is worship content in its own language and is not translated. Only the
// labels of empty slots are interface text. Sizes use cqw, a share of the slide width.

// Dark, saturated colors: each role stays readable on a weak projector.
const ROLE_COLORS: Record<string, string> = {
  P: "#0a0a0a",
  J: "#991b1b",
  L: "#166534",
  M: "#1e3a8a",
  "P+J": "#6b21a8",
};

function Cover({ title, subtitle, footer }: { title?: string; subtitle?: string; footer?: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-[2.6cqw] px-[7cqw] text-center">
        <p className="text-[5cqw] leading-tight font-semibold text-balance">{title}</p>
        {subtitle && <p className="text-[3.6cqw] font-medium text-(--slide-lyric)">{subtitle}</p>}
      </div>
      {footer && (
        <p className="border-t border-black/20 px-[4cqw] py-[1.8cqw] text-center text-[2.2cqw] text-(--slide-muted)">
          {emphasize(footer)}
        </p>
      )}
    </div>
  );
}

function Slot({ kind }: { kind: "song" | "scripture" }) {
  const t = useTranslations("Templates.slots");
  const Icon = kind === "song" ? Music : BookOpen;

  return (
    <div className="flex h-full items-center justify-center p-[4cqw]">
      <div className="flex h-full w-full flex-col items-center justify-center gap-[1.6cqw] rounded-[1.5cqw] border-[0.3cqw] border-dashed border-black/30 text-center">
        <Icon aria-hidden className="size-[6cqw] text-(--slide-lyric)" />
        <p className="text-[3.6cqw] font-semibold">{t(kind)}</p>
        <p className="text-[2.2cqw] text-(--slide-muted)">{t("hint")}</p>
      </div>
    </div>
  );
}

function Reading({ title, lines, page, pages }: { title?: string; lines: ReadingLine[]; page: number; pages: number }) {
  return (
    <div className="flex h-full flex-col px-[5cqw] py-[3.4cqw]">
      <header className="flex items-baseline justify-between text-[2.2cqw] text-(--slide-muted)">
        <p className="font-semibold">{title}</p>
        {pages > 1 && (
          <p>
            {page} / {pages}
          </p>
        )}
      </header>
      <ul className="flex flex-1 flex-col justify-center gap-[1.8cqw]">
        {lines.map((line, index) => (
          <li
            key={index}
            className="grid grid-cols-[7cqw_1fr] gap-[1.5cqw] text-[3.4cqw] leading-snug"
            style={{ color: ROLE_COLORS[line.role] ?? ROLE_COLORS.P }}
          >
            <span className="font-bold">{line.role}</span>
            <span className="font-medium">{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FrameChurch = Pick<Church, "name" | "slug">;

// The cover of a church that has a logo is a bumper over a moving backdrop: the logo, the
// title, the date and the footer as a notice. Any other cover shows its title, subtitle
// and footer.
function CoverFrame({
  content,
  church,
  live,
}: {
  content: Extract<TemplateSlide, { kind: "cover" }>["content"];
  church?: FrameChurch;
  live: boolean;
}) {
  // A template has no date yet, so the cover is dated for the coming Sunday.
  const [sunday] = useState(() => upcomingSunday(new Date()));
  const title = content.title && coverTitle(content.title, sunday);
  const logos = church && churchLogos(church.slug);
  // The bumper raises the water of the backdrop in time with its band.
  const water = useRef<HTMLDivElement>(null);

  if (!logos) return <Cover {...content} title={title} />;

  return (
    <div className="relative h-full">
      <Backdrop live={live} lift={content.footer ? BAND_HEIGHT : 0} water={water} />
      <div className="relative h-full">
        <Bumper
          logo={logos.emblem}
          wordmark={logos.wordmark}
          church={church.name}
          title={title}
          date={serviceDateLine(sunday)}
          notice={content.footer}
          live={live}
          water={water}
        />
      </div>
    </div>
  );
}

// Draws one frame of a template. Motion plays only when the frame is live: thumbnails
// stay still.
export function FrameView({ frame, church, live = false }: { frame: Frame; church?: FrameChurch; live?: boolean }) {
  const { slide } = frame;

  return (
    <div className="slide-frame">
      {slide.kind === "cover" && <CoverFrame content={slide.content} church={church} live={live} />}
      {slide.kind === "section" && <Section {...slide.content} live={live} />}
      {slide.kind === "song" && (frame.song ? <SongSlideBody slide={frame.song} /> : <Slot kind="song" />)}
      {slide.kind === "scripture" && <Slot kind="scripture" />}
      {slide.kind === "responsive_reading" && (
        <Reading
          title={slide.content.title}
          lines={frame.lines ?? []}
          page={frame.page ?? 1}
          pages={frame.pages ?? 1}
        />
      )}
    </div>
  );
}
