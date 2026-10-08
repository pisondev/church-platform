import { describe, expect, test } from "vitest";

import { buildFrames, paginateLines, ROWS_PER_FRAME } from "./frames";
import type { ReadingLine, TemplateSlide } from "./types";

const short = (text: string): ReadingLine => ({ role: "J", text });
const long: ReadingLine = { role: "P", text: "x".repeat(100) }; // three rows

describe("paginateLines", () => {
  test("keeps a short reading on one frame", () => {
    const lines = [short("a"), short("b"), short("c")];

    expect(paginateLines(lines)).toEqual([lines]);
  });

  test("starts a new frame when the rows run out", () => {
    const lines = Array.from({ length: ROWS_PER_FRAME + 2 }, (_, index) => short(`line ${index}`));

    const pages = paginateLines(lines);

    expect(pages.map((page) => page.length)).toEqual([ROWS_PER_FRAME, 2]);
    expect(pages.flat()).toEqual(lines);
  });

  test("counts a long line for the rows it wraps onto", () => {
    const pages = paginateLines([long, long, short("tail")]);

    expect(pages).toEqual([[long, long], [short("tail")]]);
  });

  test("gives a line longer than a frame its own frame", () => {
    const huge: ReadingLine = { role: "P", text: "x".repeat(1000) };

    expect(paginateLines([short("a"), huge, short("b")])).toEqual([[short("a")], [huge], [short("b")]]);
  });

  test("returns nothing for an empty reading", () => {
    expect(paginateLines([])).toEqual([]);
  });
});

describe("buildFrames", () => {
  const slides: TemplateSlide[] = [
    { id: "a", position: 1, kind: "cover", content: { title: "Welcome" } },
    { id: "b", position: 2, kind: "song", content: {} },
    {
      id: "c",
      position: 3,
      kind: "responsive_reading",
      content: { title: "Creed", lines: [long, long, long] },
    },
    { id: "d", position: 4, kind: "responsive_reading", content: { title: "Empty" } },
  ];

  test("gives every other slide exactly one frame, in order", () => {
    const frames = buildFrames(slides);

    expect(frames.slice(0, 2).map((frame) => [frame.key, frame.slide.kind])).toEqual([
      ["a", "cover"],
      ["b", "song"],
    ]);
  });

  test("spreads a long reading over numbered frames", () => {
    const reading = buildFrames(slides).filter((frame) => frame.slide.id === "c");

    expect(reading.map((frame) => [frame.key, frame.page, frame.pages, frame.lines?.length])).toEqual([
      ["c-1", 1, 2, 2],
      ["c-2", 2, 2, 1],
    ]);
  });

  test("keeps a reading without lines as one empty frame", () => {
    const empty = buildFrames(slides).filter((frame) => frame.slide.id === "d");

    expect(empty).toHaveLength(1);
    expect(empty[0]).toMatchObject({ lines: [], page: 1, pages: 1 });
  });

  test("uses unique keys", () => {
    const keys = buildFrames(slides).map((frame) => frame.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
