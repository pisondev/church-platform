import { Notation } from "@/features/notation/notation";
import { parsePhrase } from "@/features/notation/parse";

import { FitToWidth } from "./fit-to-width";
import { type Song, songBooks, type SongSlide } from "./types";

// Slide content is worship material in its own language, so it is not translated.
// Sizes use cqw, a share of the slide width: a slide looks the same at any size.

function Reference({ song }: { song: Song }) {
  return (
    <span className="font-semibold">
      {song.book} {song.number}
    </span>
  );
}

function TitleSlide({ song, verseLabels }: { song: Song; verseLabels: string[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2.4cqw] px-[6cqw] text-center">
      <p className="text-[2.2cqw] tracking-wide text-white/60 uppercase">{songBooks[song.book]}</p>
      <p className="text-[5.2cqw] leading-tight font-semibold">
        <Reference song={song} /> : {verseLabels.join(", ")}
      </p>
      <p className="text-[4.2cqw] leading-tight italic">“{song.title}”</p>
    </div>
  );
}

function PhraseSlide({ slide }: { slide: Extract<SongSlide, { kind: "phrases" }> }) {
  const { song, section, phrases } = slide;

  return (
    <div className="flex h-full flex-col px-[4cqw] py-[3cqw]">
      <header className="flex items-baseline justify-between gap-[2cqw] text-[2.2cqw]">
        <p className="truncate">
          <Reference song={song} />
          <span className="ml-[1.4cqw] text-white/70">{song.title}</span>
        </p>
        <p className="shrink-0 text-[1.8cqw] text-white/60">
          {[song.key, song.meter, song.tempo].filter(Boolean).join("  ·  ")}
        </p>
      </header>

      <FitToWidth className="flex flex-1 flex-col justify-center gap-[3cqw] [--base:4.8cqw]">
        {phrases.map((phrase) => (
          <div key={phrase.notes + phrase.lyrics}>
            <Notation phrase={parsePhrase(phrase.notes, phrase.lyrics)} />
          </div>
        ))}
      </FitToWidth>

      <footer className="text-[1.8cqw] text-white/60">
        {section.kind === "refrain" ? (
          <span>Refrein</span>
        ) : (
          <span className="inline-flex size-[3cqw] items-center justify-center rounded-full border border-white/50 font-semibold text-white">
            {section.label}
          </span>
        )}
      </footer>
    </div>
  );
}

export function SlideView({ slide }: { slide: SongSlide }) {
  return (
    <div className="slide-frame">
      {slide.kind === "title" ? (
        <TitleSlide song={slide.song} verseLabels={slide.verseLabels} />
      ) : (
        <PhraseSlide slide={slide} />
      )}
    </div>
  );
}
