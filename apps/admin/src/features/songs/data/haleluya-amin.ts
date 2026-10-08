import type { Song } from "../types";

// The response sung after the reading of Scripture. It comes from no song book.
export const haleluyaAmin: Song = {
  id: "haleluya-amin",
  title: "Haleluya, Amin",
  key: "do = f",
  meter: "4 ketuk",
  melody: [
    "7 | 1' 7 5 7 | 1' . .",
    "7 | 1' 7 5 7 | 1' . .",
    "7 | 1' 3' 4' 5' | 4' . .",
    "3' | 5' 4' 3' 4' | 3' . . ||",
  ],
  verses: [
    {
      label: "",
      lyrics: [
        "Ha- le- lu- ya, a- min,",
        "ha- le- lu- ya, a- min.",
        "Ha- le- lu- ya, a- min,",
        "ha- le- lu- ya, a- min.",
      ],
    },
  ],
};
