# Song notation format

Songs are stored as text and drawn by the system: cipher (numbered) notation with the lyrics aligned under the notes. No images are involved.

The parser is `apps/admin/src/features/notation/parse.ts`. The renderer is `notation.tsx` next to it, styled by the `.notation` rules in `apps/admin/src/app/globals.css`.

## A song

A song has a melody and verses. The melody is a list of phrases (musical sentences). Each verse gives the lyrics for every phrase, in the same order.

```ts
melody: [
  "5, | 1 . [(3 1)] | 3 . 2 | 1 . 6, | 5, . '",
  "5, | 1 . [(3 1)] | 3 . 2 | (5 . . | 5 .) '",
],
verses: [
  { label: "1", lyrics: ["A- jaib be- nar a- nu- ge- rah", "pem- ba- ru hi- dup- ku!"] },
],
```

A refrain, when present, has its own melody and lyrics and is repeated after every verse.

## Notes

Tokens are separated by spaces.

| Token | Meaning |
| --- | --- |
| `1` to `7` | Scale degree |
| `0` | Rest |
| `.` | Sustain the previous note for one beat |
| `5,` | One octave below (dot under the number). Repeat for more: `5,,` |
| `1'` | One octave above (dot over the number). Repeat for more: `1''` |
| `#4` | Raised note, drawn with a rising stroke |
| `b7` | Lowered note, drawn with a falling stroke |
| `5~` | Fermata |
| `\|` | Bar line |
| `\|\|` | Final bar line |
| `'` | Breath mark, when it stands alone |
| `[3 1]` | Beam: the notes share a line above them. Nest for a second line: `[[3 1]]` |
| `(3 1)` | Slur or tie: the notes are sung on one syllable. It may cross a bar line |

Beams and slurs combine in either order: `[(3 1)]`, `(5 [. 3])`.

## Lyrics

One syllable per sung note, separated by spaces.

- End a syllable with `-` when the word continues: `A- jaib`.
- A slur takes a single syllable, on its first note.
- Rests and sustains take none.
- Use `_` for a note that has no text.

The parser rejects a phrase whose syllable count does not match its sung notes, so a transcription mistake fails the tests instead of reaching a slide.

## Slides

`buildSongSlides` in `apps/admin/src/features/songs/slides.ts` turns a song into slides: a title slide, then every chosen verse, two phrases per slide at most.

## Adding a song

1. Add a file under `apps/admin/src/features/songs/data` and list it in `library.ts`.
2. Run `pnpm --filter @church-platform/admin test`. The suite parses every phrase of every verse.
3. Open `/songs` in the admin panel and check the slides against the hymnal.

The built-in songs live in the admin app for now. They move behind the API once the song library has its own storage.
