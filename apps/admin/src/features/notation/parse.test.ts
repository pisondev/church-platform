import { describe, expect, test } from "vitest";

import { NotationError, parsePhrase } from "./parse";

const note = (degree: number, octave = 0) => ({
  kind: "note",
  degree,
  octave,
  accidental: null,
  fermata: false,
});

describe("cells", () => {
  test("reads notes, rests, sustains, bars and breath marks", () => {
    const { cells } = parsePhrase("5 0 . | ' 1 ||");

    expect(cells).toEqual([
      note(5),
      { kind: "rest" },
      { kind: "sustain" },
      { kind: "bar", final: false },
      { kind: "breath" },
      note(1),
      { kind: "bar", final: true },
    ]);
  });

  test("reads octave marks, accidentals and fermatas", () => {
    const { cells } = parsePhrase("5, 1' 1'' 6,, #4 b7 5'~");

    expect(cells).toEqual([
      note(5, -1),
      note(1, 1),
      note(1, 2),
      note(6, -2),
      { ...note(4), accidental: "sharp" },
      { ...note(7), accidental: "flat" },
      { ...note(5, 1), fermata: true },
    ]);
  });

  test.each([
    ["8", 'Unknown token "8"'],
    ["do", 'Unknown token "do"'],
    ["0'", "A rest takes no marks"],
    ["", "at least one note"],
  ])("rejects %j", (notes, message) => {
    expect(() => parsePhrase(notes)).toThrow(NotationError);
    expect(() => parsePhrase(notes)).toThrow(message);
  });
});

describe("groups", () => {
  test("records beams with their level", () => {
    const { beams } = parsePhrase("1 [3 1] [5 [3 2]] 1");

    expect(beams).toEqual([
      { start: 1, end: 2, level: 1 },
      { start: 3, end: 5, level: 1 },
      { start: 4, end: 5, level: 2 },
    ]);
  });

  test("records slurs, alone or combined with beams", () => {
    const { slurs, beams } = parsePhrase("(5 [. 3]) [(5 3)] 1");

    expect(slurs).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 4 },
    ]);
    expect(beams).toEqual([
      { start: 1, end: 2, level: 1 },
      { start: 3, end: 4, level: 1 },
    ]);
  });

  test("accepts brackets written as separate tokens", () => {
    expect(parsePhrase("[ 3 1 ]").beams).toEqual([{ start: 0, end: 1, level: 1 }]);
  });

  test.each([
    ["[3 1", 'Unclosed "["'],
    ["(3 1", 'Unclosed "("'],
    ["3 1]", 'Unbalanced "]"'],
    ["[(3 1])", 'Unbalanced "]"'],
    ["[[[1 2]]]", "two levels at most"],
    ["[ ] 1", "Empty group"],
  ])("rejects %j", (notes, message) => {
    expect(() => parsePhrase(notes)).toThrow(message);
  });
});

describe("syllables", () => {
  test("gives each sung note one syllable", () => {
    const { syllables } = parsePhrase("5, | 1 . 3 | 2", "A- jaib be- nar");

    expect(syllables).toEqual([
      { start: 0, end: 0, text: "A-" },
      { start: 2, end: 3, text: "jaib" },
      { start: 4, end: 4, text: "be-" },
      { start: 6, end: 6, text: "nar" },
    ]);
  });

  test("sings a slur on one syllable, across a bar line too", () => {
    const { syllables } = parsePhrase("[(3 1)] 2 | (5 . . | 5 .)", "be- nar ku");

    expect(syllables).toEqual([
      { start: 0, end: 1, text: "be-" },
      { start: 2, end: 2, text: "nar" },
      { start: 4, end: 9, text: "ku" },
    ]);
  });

  test("skips rests and lets _ leave a note without text", () => {
    const { syllables } = parsePhrase("1 0 2 3", "satu _ tiga");

    expect(syllables).toEqual([
      { start: 0, end: 0, text: "satu" },
      { start: 3, end: 3, text: "tiga" },
    ]);
  });

  test("allows a phrase without lyrics", () => {
    expect(parsePhrase("1 2 3").syllables).toEqual([]);
  });

  test("reports a syllable count that does not match the notes", () => {
    expect(() => parsePhrase("1 2 3", "sa- tu")).toThrow("Expected 3 syllables but got 2");
  });
});

describe("triplets", () => {
  test("braces mark three notes sung in the time of two", () => {
    const phrase = parsePhrase("5 {4' 3' 2'} | 1'", "ti- a- da ber- bah");

    expect(phrase.tuplets).toEqual([{ start: 1, end: 3 }]);
    // Every note of a triplet carries its own syllable.
    expect(phrase.syllables.map((syllable) => syllable.text)).toEqual(["ti-", "a-", "da", "ber-", "bah"]);
  });

  test("a triplet can be beamed, and a phrase can hold more than one", () => {
    const phrase = parsePhrase("{[6 6 7]} 1 {1 2 3}");

    expect(phrase.tuplets).toEqual([
      { start: 0, end: 2 },
      { start: 4, end: 6 },
    ]);
    expect(phrase.beams).toEqual([{ start: 0, end: 2, level: 1 }]);
  });

  test("an unclosed or stray brace is rejected", () => {
    expect(() => parsePhrase("{4 3 2")).toThrow('Unclosed "{"');
    expect(() => parsePhrase("4 3 2}")).toThrow('Unbalanced "}"');
    expect(() => parsePhrase("{4 3 2]")).toThrow('Unbalanced "]"');
  });
});
