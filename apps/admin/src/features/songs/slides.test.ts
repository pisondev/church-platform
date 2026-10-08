import { describe, expect, test } from "vitest";

import { parsePhrase } from "@/features/notation/parse";

import { songs } from "./library";
import { buildSongSlides, PHRASES_PER_SLIDE } from "./slides";
import type { Song } from "./types";

const withRefrain: Song = {
  id: "test",
  book: "KJ",
  number: "1",
  title: "Test",
  key: "do = c",
  meter: "4 ketuk",
  melody: ["1 2", "3 4", "5 6"],
  verses: [
    { label: "1", lyrics: ["a b", "c d", "e f"] },
    { label: "2", lyrics: ["g h", "i j", "k l"] },
  ],
  refrain: { melody: ["1 1"], lyrics: ["r r"] },
};

describe("buildSongSlides", () => {
  test("opens with a title slide listing the verses", () => {
    const [title] = buildSongSlides(withRefrain);

    expect(title).toMatchObject({ kind: "title", verseLabels: ["1", "2"] });
  });

  test("never puts more than two phrases on a slide", () => {
    for (const slide of buildSongSlides(withRefrain)) {
      if (slide.kind === "phrases") {
        expect(slide.phrases.length).toBeLessThanOrEqual(PHRASES_PER_SLIDE);
      }
    }
  });

  test("repeats the refrain after every verse", () => {
    const sections = buildSongSlides(withRefrain).flatMap((slide) =>
      slide.kind === "phrases"
        ? [`${slide.section.kind}${slide.section.label}:${slide.phrases.length}`]
        : [],
    );

    expect(sections).toEqual([
      "verse1:2",
      "verse1:1",
      "refrain:1",
      "verse2:2",
      "verse2:1",
      "refrain:1",
    ]);
  });

  test("keeps only the chosen verses, in song order", () => {
    const slides = buildSongSlides(withRefrain, ["2"]);
    const verseSlides = slides.filter(
      (slide) => slide.kind === "phrases" && slide.section.kind === "verse",
    );

    expect(slides[0]).toMatchObject({ verseLabels: ["2"] });
    expect(verseSlides).toHaveLength(2);
  });

  test("pairs each phrase of the melody with its lyrics", () => {
    const [, first] = buildSongSlides(withRefrain);

    expect(first).toMatchObject({
      phrases: [
        { notes: "1 2", lyrics: "a b" },
        { notes: "3 4", lyrics: "c d" },
      ],
    });
  });
});

describe.each(songs.map((song) => [song.id, song] as const))("built-in song %s", (_id, song) => {
  test("has lyrics for every phrase of every verse", () => {
    for (const verse of song.verses) {
      expect(verse.lyrics, `verse ${verse.label}`).toHaveLength(song.melody.length);
    }
  });

  test("parses on every slide", () => {
    for (const slide of buildSongSlides(song)) {
      if (slide.kind !== "phrases") continue;
      for (const phrase of slide.phrases) {
        expect(() => parsePhrase(phrase.notes, phrase.lyrics), phrase.lyrics).not.toThrow();
      }
    }
  });
});
