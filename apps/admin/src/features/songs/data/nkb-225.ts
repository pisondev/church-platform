import type { Song } from "../types";

// Sung after the blessing. It is one piece, not a set of verses.
export const nkb225: Song = {
  id: "nkb-225",
  book: "NKB",
  number: "225",
  title: "Haleluya, Amin",
  key: "do = d",
  meter: "4 ketuk",
  melody: [
    "1 [. 2] 3 5 | 6 [. 7] 1' 7 | 1' [. 7] 6 5 |",
    "5 [. 1] [(2 3)] 4 | 3 [. 5] 1' 5 '",
    "6 . 5 . | 4 . 3 . | 2 . 1~ . ||",
  ],
  verses: [
    {
      label: "",
      lyrics: [
        "Ha- le- lu- ya, ha- le- lu- ya, ha- le- lu- ya,",
        "ha- le- lu- ya, ha- le- lu- ya.",
        "A- min, a- min, a- min!",
      ],
    },
  ],
};
