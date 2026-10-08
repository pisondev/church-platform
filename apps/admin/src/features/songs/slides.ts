import type { Song, SongPhrase, SongSlide } from "./types";

// A slide shows at most this many phrases, so the notation stays readable from the back.
export const PHRASES_PER_SLIDE = 2;

function pair(melody: readonly string[], lyrics: readonly string[]): SongPhrase[] {
  return melody.map((notes, index) => ({ notes, lyrics: lyrics[index] ?? "" }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

// Builds the slides for a song: a title slide, then each chosen verse split into slides,
// with the refrain repeated after every verse. An empty selection means every verse.
export function buildSongSlides(song: Song, verseLabels: readonly string[] = []): SongSlide[] {
  const verses =
    verseLabels.length > 0
      ? song.verses.filter((verse) => verseLabels.includes(verse.label))
      : song.verses;

  const slides: SongSlide[] = [
    { kind: "title", song, verseLabels: verses.map((verse) => verse.label) },
  ];

  for (const verse of verses) {
    for (const phrases of chunk(pair(song.melody, verse.lyrics), PHRASES_PER_SLIDE)) {
      slides.push({ kind: "phrases", song, section: { kind: "verse", label: verse.label }, phrases });
    }
    if (song.refrain) {
      const refrain = pair(song.refrain.melody, song.refrain.lyrics);
      for (const phrases of chunk(refrain, PHRASES_PER_SLIDE)) {
        slides.push({ kind: "phrases", song, section: { kind: "refrain", label: "" }, phrases });
      }
    }
  }

  return slides;
}
