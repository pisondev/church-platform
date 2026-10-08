// Shapes returned by the church and template endpoints of the API.

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
  | (Base & { kind: "song"; content: Record<string, never> })
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
};
