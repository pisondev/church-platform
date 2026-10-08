import type { Frame, ReadingLine, TemplateSlide } from "./types";

// A frame holds this many rows of reading text. A line wraps after about CHARS_PER_ROW
// characters at the size the slide uses, so a long line counts for several rows.
export const ROWS_PER_FRAME = 6;
const CHARS_PER_ROW = 48;

function rows(line: ReadingLine): number {
  return Math.max(1, Math.ceil(line.text.length / CHARS_PER_ROW));
}

// Splits the lines of a reading into groups that each fit on one frame.
export function paginateLines(lines: ReadingLine[]): ReadingLine[][] {
  const pages: ReadingLine[][] = [];
  let current: ReadingLine[] = [];
  let used = 0;

  for (const line of lines) {
    const needed = rows(line);
    if (current.length > 0 && used + needed > ROWS_PER_FRAME) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(line);
    used += needed;
  }
  if (current.length > 0) pages.push(current);

  return pages;
}

// Turns the slides of a template into the frames shown on screen, in order.
export function buildFrames(slides: TemplateSlide[]): Frame[] {
  return slides.flatMap((slide): Frame[] => {
    if (slide.kind !== "responsive_reading") return [{ key: slide.id, slide }];

    const pages = paginateLines(slide.content.lines ?? []);
    if (pages.length === 0) return [{ key: slide.id, slide, lines: [], page: 1, pages: 1 }];

    return pages.map((lines, index) => ({
      key: `${slide.id}-${index + 1}`,
      slide,
      lines,
      page: index + 1,
      pages: pages.length,
    }));
  });
}
