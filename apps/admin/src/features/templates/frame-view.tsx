import { BookOpen, Music } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bumper } from "./bumper";
import { churchLogo } from "./church-logo";
import type { Church, Frame, ReadingLine } from "./types";

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

function Heading({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2.4cqw] px-[7cqw] text-center">
      <p className="text-[5.6cqw] leading-tight font-semibold text-balance">{title}</p>
      {subtitle && (
        <p className="text-[3cqw] leading-snug text-balance text-(--slide-muted)">{subtitle}</p>
      )}
    </div>
  );
}

function Cover({ title, subtitle, footer }: { title?: string; subtitle?: string; footer?: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-[2.6cqw] px-[7cqw] text-center">
        <p className="text-[5cqw] leading-tight font-semibold text-balance">{title}</p>
        {subtitle && <p className="text-[3.6cqw] font-medium text-(--slide-lyric)">{subtitle}</p>}
      </div>
      {footer && (
        <p className="border-t border-black/20 px-[4cqw] py-[1.8cqw] text-center text-[2.2cqw] text-(--slide-muted)">
          {footer}
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

// Draws one frame of a template. The cover of a church that has a logo is a bumper, and
// its text is not shown for now; any other cover shows its text. Motion plays only when
// the frame is live: thumbnails stay still.
export function FrameView({
  frame,
  church,
  live = false,
}: {
  frame: Frame;
  church?: Pick<Church, "name" | "slug">;
  live?: boolean;
}) {
  const { slide } = frame;
  const logo = church && churchLogo(church.slug);

  return (
    <div className="slide-frame">
      {slide.kind === "cover" &&
        (logo ? <Bumper logo={logo} church={church.name} live={live} /> : <Cover {...slide.content} />)}
      {slide.kind === "section" && <Heading {...slide.content} />}
      {(slide.kind === "song" || slide.kind === "scripture") && <Slot kind={slide.kind} />}
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
