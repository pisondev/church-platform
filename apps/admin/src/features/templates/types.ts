// Shapes returned by the church and template endpoints of the API.

import type { SongSlide } from "@/features/songs/types";

export type Church = { id: string; name: string; slug: string; status: string };

export type TemplateSummary = {
  id: string;
  name: string;
  aspectRatio: string;
  slideCount: number;
  updatedAt: string;
};

export type ReadingLine = { role: string; text: string };

type Base = { id: string; position: number };

export type TemplateSlide =
  | (Base & { kind: "cover"; content: { title?: string; subtitle?: string; footer?: string } })
  | (Base & { kind: "section"; content: { title?: string; subtitle?: string } })
  // An empty slot, or a song of the library that is the same every week. Without verses
  // the whole song is sung.
  | (Base & { kind: "song"; content: { song?: string; verses?: string[] } })
  | (Base & { kind: "scripture"; content: Record<string, never> })
  | (Base & { kind: "responsive_reading"; content: { title?: string; lines?: ReadingLine[] } });

export type Template = TemplateSummary & { slides: TemplateSlide[] };

// One screen of a presentation. A long responsive reading spreads over several frames.
export type Frame = {
  key: string;
  slide: TemplateSlide;
  // Set for responsive readings: the lines on this frame and where it sits in the reading.
  lines?: ReadingLine[];
  page?: number;
  pages?: number;
  // Set for a song slide that names a song: the part of the song on this frame.
  song?: SongSlide;
};
