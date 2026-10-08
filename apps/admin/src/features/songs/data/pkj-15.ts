import type { Song } from "../types";

// The melody runs on without a break: most phrases start partway through a bar, and a
// long note is often tied over the bar line into the next phrase.
export const pkj15: Song = {
  id: "pkj-15",
  book: "PKJ",
  number: "15",
  title: "Kusiapkan Hatiku, Tuhan",
  key: "do = g",
  meter: "4 ketuk",
  melody: [
    "[0 [3 4]] | [5 5] [. [5 6]] [5 [4 3]]",
    "[. 4] | [5 5] [. [5 6]] 5 [0 1'] | 1' [. 6] (6 . | 6) . .",
    "[0 [2 3]] | [4 4] [. [4 5]] [4 [3 2]]",
    "[. 3] | [4 4] [. [4 5]] 4 [. 7] | 6 [. 5] (5 . | 5) . .",
    "[0 [3 4]] | [5 5] [. [5 6]] [5 [4 3]]",
    "[. 4] | [5 5] [. [5 6]] 5 [0 3'] | 2' [. 1'] (6 . | 6)",
    "[1' 1'] [1' 1'] [7 6] | 5 [3' 1'] .",
    "[0 5] | 4 2' 1' [. 7] | (1' . . . | 1')",
    "0 1' 2' | 3' [. 1'] (5 . | 5)",
    "[0 5] {4' 3' 2'} | (2' [. 1']) (1' . | 1')",
    "[0 6] [1' 7] [. [7 6]] | 7",
    "[0 6] [1' 7] [. [7 6]] | 7 {[6 6 7]} (6 [. 5]) | (5 . . . | 5)",
    "0 1' 2' | 3' [. 1'] (5 . | 5)",
    "[0 5] {4' 3' 2'} | (2' [. 1']) (1' . | 1')",
    "[1' 1'] [1' 1'] [7 6] | 5 [3' 1'] .",
    "[0 5] | 4 2' 1' [. 7] | (1' . . . | 1') . 0 ||",
  ],
  verses: [
    {
      label: "1",
      lyrics: [
        "Ku- si- ap- kan ha- ti- ku, Tu- han,",
        "me- nyam- but fir- man- Mu, sa- at i- ni.",
        "A- ku su- jud me- nyem- bah Eng- kau",
        "da- lam ha- di- rat- Mu, sa- at i- ni.",
        "Cu- rah- kan- lah pe- ngu- rap- an- Mu",
        "ke- pa- da u- mat- Mu sa- at i- ni.",
        "Ku- si- ap- kan ha- ti- ku, Tu- han,",
        "men- de- ngar fir- man- Mu.",
        "Fir- man- Mu, Tu- han,",
        "ti- a- da ber- u- bah,",
        "se- jak se- mu- la- nya",
        "dan s'la- ma- la- ma- nya tia- da ber- u- bah.",
        "Fir- man- Mu, Tu- han,",
        "pe- no- long hi- dup- ku.",
        "Ku- si- ap- kan ha- ti- ku, Tu- han,",
        "me- nyam- but fir- man- Mu.",
      ],
    },
  ],
};
