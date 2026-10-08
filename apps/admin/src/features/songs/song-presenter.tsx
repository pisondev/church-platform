"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { SlideView } from "./slide-view";
import { buildSongSlides } from "./slides";
import { Slideshow } from "./slideshow";
import type { Song } from "./types";

// Lets the user choose verses and previews the resulting slides.
export function SongPresenter({ song }: { song: Song }) {
  const t = useTranslations("Songs");
  const [selected, setSelected] = useState(() => song.verses.map((verse) => verse.label));
  const slides = useMemo(
    () => buildSongSlides(song, selected).map((slide, index) => <SlideView key={index} slide={slide} />),
    [song, selected],
  );

  const toggle = (label: string) =>
    setSelected((labels) =>
      labels.includes(label) ? labels.filter((item) => item !== label) : [...labels, label],
    );

  return (
    <div>
      <fieldset className="mb-6 flex flex-wrap items-center gap-4">
        <legend className="mb-2 text-sm font-medium">{t("versesLegend")}</legend>
        {song.verses.map((verse) => {
          const checked = selected.includes(verse.label);
          return (
            <label key={verse.label} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-(--accent)"
                checked={checked}
                // At least one verse stays selected.
                disabled={checked && selected.length === 1}
                onChange={() => toggle(verse.label)}
              />
              {t("verse", { label: verse.label })}
            </label>
          );
        })}
      </fieldset>

      <Slideshow slides={slides} />
    </div>
  );
}
