// Song book codes used to classify the library.
export const songBooks = {
  KJ: "Kidung Jemaat",
  PKJ: "Pelengkap Kidung Jemaat",
  KPJ: "Kidung Pasamuwan Jawi",
  KK: "Kidung Keesaan",
  KPK: "Kidung Pasamuwan Kristen",
} as const;

export type SongBook = keyof typeof songBooks;

// A song is a melody of phrases (musical sentences) and, per verse, the lyrics of each
// phrase. See features/notation/parse.ts for the text format of notes and lyrics.
export type Song = {
  id: string;
  book: SongBook;
  number: string;
  title: string;
  key: string;
  meter: string;
  tempo?: string;
  // Notes of each phrase. Every verse is sung to these.
  melody: readonly string[];
  // Lyrics of each verse, one string per phrase of the melody.
  verses: readonly { label: string; lyrics: readonly string[] }[];
  // Optional refrain, sung after every verse.
  refrain?: { melody: readonly string[]; lyrics: readonly string[] };
};

export type SongPhrase = { notes: string; lyrics: string };

export type SongSlide =
  | { kind: "title"; song: Song; verseLabels: string[] }
  | {
      kind: "phrases";
      song: Song;
      section: { kind: "verse" | "refrain"; label: string };
      phrases: SongPhrase[];
    };
