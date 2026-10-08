// Parser for cipher (numbered) music notation written as plain text.
//
// Notes line, tokens separated by spaces:
//   1..7   scale degree        0    rest            .    sustain the previous note
//   5,     octave below        1'   octave above    #4   raised        b7   lowered
//   5~     fermata             |    bar line        ||   final bar     '    breath mark
//   [3 1]  beamed (half beat); nest for a second beam: [[3 1]]
//   (3 1)  slurred or tied: sung on one syllable
//   {4 3 2}  triplet: three notes in the time of two
//
// Lyrics line: one syllable per sung note, separated by spaces. End a syllable with "-"
// when the word continues. Use "_" for a note without a syllable.

export type Accidental = "sharp" | "flat";

export type Cell =
  | { kind: "note"; degree: number; octave: number; accidental: Accidental | null; fermata: boolean }
  | { kind: "rest" }
  | { kind: "sustain" }
  | { kind: "bar"; final: boolean }
  | { kind: "breath" };

// Column ranges are inclusive on both ends.
export type Span = { start: number; end: number };
export type Beam = Span & { level: 1 | 2 };
export type Syllable = Span & { text: string };

export type Phrase = {
  cells: Cell[];
  beams: Beam[];
  slurs: Span[];
  tuplets: Span[];
  syllables: Syllable[];
};

export class NotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotationError";
  }
}

const NOTE = /^([#b]?)([0-7])([',]*)(~?)$/;

function parseCell(token: string): Cell {
  if (token === "|") return { kind: "bar", final: false };
  if (token === "||") return { kind: "bar", final: true };
  if (token === "'") return { kind: "breath" };
  if (token === ".") return { kind: "sustain" };

  const match = NOTE.exec(token);
  if (!match) throw new NotationError(`Unknown token "${token}"`);

  const [, accidental, digit, marks, fermata] = match;
  if (digit === "0") {
    if (accidental || marks || fermata) throw new NotationError(`A rest takes no marks: "${token}"`);
    return { kind: "rest" };
  }

  let octave = 0;
  for (const mark of marks) octave += mark === "'" ? 1 : -1;

  return {
    kind: "note",
    degree: Number(digit),
    octave,
    accidental: accidental === "#" ? "sharp" : accidental === "b" ? "flat" : null,
    fermata: fermata === "~",
  };
}

type GroupType = "beam" | "slur" | "tuplet";
type OpenGroup = { type: GroupType; start: number };

const OPENERS: Record<string, GroupType> = { "[": "beam", "(": "slur", "{": "tuplet" };
const CLOSERS: Record<string, GroupType> = { "]": "beam", ")": "slur", "}": "tuplet" };
const OPENER_OF: Record<GroupType, string> = { beam: "[", slur: "(", tuplet: "{" };

function parseCells(notes: string) {
  const cells: Cell[] = [];
  const beams: Beam[] = [];
  const slurs: Span[] = [];
  const tuplets: Span[] = [];
  const open: OpenGroup[] = [];

  const close = (closer: string) => {
    const type = CLOSERS[closer];
    const group = open.pop();
    if (!group || group.type !== type) throw new NotationError(`Unbalanced "${closer}"`);

    const span = { start: group.start, end: cells.length - 1 };
    if (span.end < span.start) throw new NotationError(`Empty group before "${closer}"`);

    if (type === "slur") {
      slurs.push(span);
      return;
    }
    if (type === "tuplet") {
      tuplets.push(span);
      return;
    }
    const level = open.filter((g) => g.type === "beam").length + 1;
    if (level > 2) throw new NotationError("Beams nest two levels at most");
    beams.push({ ...span, level: level as 1 | 2 });
  };

  for (const raw of notes.trim().split(/\s+/).filter(Boolean)) {
    let token = raw;
    while (token[0] in OPENERS) {
      open.push({ type: OPENERS[token[0]], start: cells.length });
      token = token.slice(1);
    }
    let closers = "";
    while (token.slice(-1) in CLOSERS) {
      closers = token.slice(-1) + closers;
      token = token.slice(0, -1);
    }

    if (token) cells.push(parseCell(token));
    for (const closer of closers) close(closer);
  }

  if (open.length > 0) {
    throw new NotationError(`Unclosed "${OPENER_OF[open[open.length - 1].type]}"`);
  }

  const byStart = (a: Span, b: Span) => a.start - b.start || b.end - a.end;
  return { cells, beams: beams.sort(byStart), slurs: slurs.sort(byStart), tuplets: tuplets.sort(byStart) };
}

// A note carries a syllable unless it continues a slur.
function sungColumns(cells: Cell[], slurs: Span[]): number[] {
  const columns: number[] = [];
  cells.forEach((cell, index) => {
    if (cell.kind !== "note") return;
    const continues = slurs.some((slur) => index > slur.start && index <= slur.end);
    if (!continues) columns.push(index);
  });
  return columns;
}

// A syllable stretches under its slur and any sustain dots that follow.
function syllableEnd(cells: Cell[], slurs: Span[], start: number): number {
  let end = start;
  for (const slur of slurs) {
    if (slur.start === start) end = Math.max(end, slur.end);
  }
  while (cells[end + 1]?.kind === "sustain") end += 1;
  return end;
}

export function parsePhrase(notes: string, lyrics = ""): Phrase {
  const { cells, beams, slurs, tuplets } = parseCells(notes);
  if (cells.length === 0) throw new NotationError("A phrase needs at least one note");

  const words = lyrics.trim().split(/\s+/).filter(Boolean);
  const syllables: Syllable[] = [];

  if (words.length > 0) {
    const columns = sungColumns(cells, slurs);
    if (words.length !== columns.length) {
      throw new NotationError(
        `Expected ${columns.length} syllables but got ${words.length}: "${lyrics.trim()}"`,
      );
    }
    columns.forEach((start, index) => {
      if (words[index] === "_") return;
      syllables.push({ start, end: syllableEnd(cells, slurs, start), text: words[index] });
    });
  }

  return { cells, beams, slurs, tuplets, syllables };
}
