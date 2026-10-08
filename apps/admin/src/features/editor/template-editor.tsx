"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { displayName, useSession } from "@/features/session/session";
import { FrameView } from "@/features/templates/frame-view";
import { buildFrames } from "@/features/templates/frames";
import type { Church, Template, TemplateSlide, TemplateSummary } from "@/features/templates/types";
import { apiSend } from "@/lib/api";

import { Filmstrip } from "./filmstrip";
import { Menubar, type MenuGroup } from "./menubar";
import { Presenter } from "./presenter";
import { type RenameResult, TitleField } from "./title-field";

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// The slide being worked on, fitted to the space it has. A responsive reading that takes
// several screens can be paged through here.
function Stage({ slide, position }: { slide: TemplateSlide; position: string }) {
  const t = useTranslations("Editor");
  const screens = useMemo(() => buildFrames([slide]), [slide]);
  const [screen, setScreen] = useState(0);
  const pagerClass =
    "inline-flex size-7 items-center justify-center rounded hover:bg-black/5 disabled:opacity-30";

  return (
    <>
      <main className="editor-stage flex min-h-0 flex-1 items-center justify-center">
        <div className="editor-canvas">
          <FrameView frame={screens[screen]} />
        </div>
      </main>

      <div className="flex h-9 items-center justify-between border-t border-border bg-surface px-4 text-sm text-muted">
        <p>
          {position} · {t(`kinds.${slide.kind}`)}
        </p>
        {screens.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={pagerClass}
              aria-label={t("previousScreen")}
              disabled={screen === 0}
              onClick={() => setScreen(screen - 1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span aria-live="polite" className="tabular-nums">
              {t("screen", { current: screen + 1, total: screens.length })}
            </span>
            <button
              type="button"
              className={pagerClass}
              aria-label={t("nextScreen")}
              disabled={screen === screens.length - 1}
              onClick={() => setScreen(screen + 1)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// The template editor: a header with the name and menus, the selected slide in the middle,
// and every slide in a strip along the bottom.
export function TemplateEditor({ church, template }: { church: Church; template: Template }) {
  const t = useTranslations("Editor");
  const router = useRouter();
  const { session } = useSession();
  const title = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(template.name);
  const [selected, setSelected] = useState(0);
  const [presentingFrom, setPresentingFrom] = useState<number | null>(null);

  const slides = template.slides;
  const last = slides.length - 1;
  const churchPath = `/churches/${church.slug}`;

  // Every screen of the slideshow, and the first screen of each slide for the filmstrip.
  const frames = useMemo(() => buildFrames(slides), [slides]);
  const thumbnails = useMemo(() => slides.map((slide) => buildFrames([slide])[0]), [slides]);

  const select = useCallback(
    (index: number) => setSelected(Math.max(0, Math.min(last, index))),
    [last],
  );

  const present = (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (slide) setPresentingFrom(frames.findIndex((frame) => frame.slide.id === slide.id));
  };
  const stopPresenting = useCallback(() => setPresentingFrom(null), []);

  useEffect(() => {
    if (presentingFrom !== null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextField(event.target)) return;

      if (NEXT_KEYS.has(event.key)) select(selected + 1);
      else if (PREVIOUS_KEYS.has(event.key)) select(selected - 1);
      else if (event.key === "Home") select(0);
      else if (event.key === "End") select(last);
      else return;

      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presentingFrom, select, selected, last]);

  const rename = async (next: string): Promise<RenameResult> => {
    const result = await apiSend<{ template: TemplateSummary }>(
      "PATCH",
      `${churchPath}/templates/${template.id}`,
      { name: next },
    );
    if (!result.ok) {
      if (result.code === "name_taken" || result.code === "invalid_name") {
        return { ok: false, reason: result.code };
      }
      return { ok: false, reason: "failed" };
    }
    setName(result.data.template.name);
    return { ok: true, name: result.data.template.name };
  };

  const empty = slides.length === 0;
  const menus: MenuGroup[] = [
    {
      label: t("menus.file"),
      commands: [
        {
          label: t("commands.rename"),
          onSelect: () => {
            title.current?.focus();
            title.current?.select();
          },
        },
        { label: t("commands.backToChurch", { church: church.name }), onSelect: () => router.push(churchPath) },
      ],
    },
    {
      label: t("menus.view"),
      commands: [
        { label: t("commands.presentFromStart"), onSelect: () => present(0), disabled: empty },
        { label: t("commands.presentFromCurrent"), onSelect: () => present(selected), disabled: empty },
      ],
    },
    {
      label: t("menus.slide"),
      commands: [
        { label: t("commands.next"), onSelect: () => select(selected + 1), disabled: empty || selected === last },
        { label: t("commands.previous"), onSelect: () => select(selected - 1), disabled: empty || selected === 0 },
        { label: t("commands.first"), onSelect: () => select(0), disabled: empty || selected === 0 },
        { label: t("commands.last"), onSelect: () => select(last), disabled: empty || selected === last },
      ],
    },
  ];

  const user = displayName(session.user);
  const current = slides[selected];

  return (
    <div className="flex h-dvh flex-col bg-[#eef0f3]">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
        <Link href={churchPath} aria-label={t("back", { church: church.name })} title={t("back", { church: church.name })}>
          <BrandMark className="size-10" />
        </Link>

        <div className="min-w-0">
          <TitleField name={name} onRename={rename} inputRef={title} />
          <Menubar label={t("menubar")} menus={menus} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            disabled={empty}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
            onClick={() => present(selected)}
          >
            <Play aria-hidden className="size-4" />
            {t("slideshow")}
          </button>
          <span
            role="img"
            aria-label={t("account", { name: user })}
            title={`${user} (${session.user.email})`}
            className="flex size-9 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground"
          >
            {user.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      {current ? (
        <Stage
          key={current.id}
          slide={current}
          position={t("position", { current: selected + 1, total: slides.length })}
        />
      ) : (
        <main className="flex flex-1 items-center justify-center text-muted">{t("empty")}</main>
      )}

      <Filmstrip frames={thumbnails} selected={selected} onSelect={select} />

      {presentingFrom !== null && (
        <Presenter
          label={t("presenting")}
          frames={frames.map((frame) => (
            <FrameView key={frame.key} frame={frame} />
          ))}
          start={presentingFrom}
          onClose={stopPresenting}
        />
      )}
    </div>
  );
}
