import type { Song } from "../types";

// Written out from the slides the church used before, which mark no low octave.
export const kp102: Song = {
  id: "kp-102",
  book: "KP",
  number: "102",
  title: "Tiap Langkahku Diatur oleh Tuhan",
  key: "do = f",
  meter: "4 ketuk",
  melody: [
    "[0 5] | [1 [. 3]] 5 [. #4] [6 [. 5]] | [1 [. 2]] 3 [. 3]",
    "[0 3] | [3 [. 4]] [3 [. 2]] 2 [. #1] | [2 [. 3]] 1 .",
    "[0 5] | [1 [. 3]] 5 [. #4] [6 [. 5]] | [1 [. 2]] 3 3 0 |",
    "[3 [. 3]] 2 [. 6] [4 [. 2]] | [3 [. #4]] 5 .",
  ],
  verses: [
    {
      label: "1",
      lyrics: [
        "Tiap lang- kah- ku di- a- tur o- leh Tu- han",
        "dan ta- ngan ka- sih- Nya me- mim- pin- ku.",
        "Di te- ngah g'lom- bang du- nia me- na- kut- kan,",
        "ha- ti- ku te- tap te- nang te- duh.",
      ],
    },
  ],
  refrain: {
    melody: [
      "[0 3] | [3 [. 2]] 1 [. 5] [1' [. 1']] | [7 [. 6]] 5 3",
      "[0 5] | [5 [. 4]] #4 [. 5] [7 [. 6]] | [5 [. 4]] 3 .",
      "[0 1] | [3 [. 5]] 1' [. 6] [4 [. 1]] | [4 [. 6]] 6 5",
      "[0 3] | [3 [. 3]] 2 [. 3] [4 [. 4]] | [3 [. 2]] 1 ||",
    ],
    lyrics: [
      "Tiap lang- kah- ku Tu- han- lah yang me- mim- pin.",
      "Ke tem- pat ting- gi ku di- an- tar- Nya,",
      "hing- ga se- ka- li nan- ti a- ku ti- ba",
      "di ru- mah Ba- pa sur- ga yang ba- ka.",
    ],
  },
};
