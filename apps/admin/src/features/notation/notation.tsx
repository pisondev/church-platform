import type { CSSProperties } from "react";

import type { Cell, Phrase, Span } from "./parse";

// Grid rows of a phrase, top to bottom. Columns are one per cell and size to their content,
// so a long syllable widens its own column and everything stays aligned.
const ROW = { beam2: 1, beam1: 2, cell: 3, slur: 4, lyric: 5 } as const;

function place(span: Span, row: number): CSSProperties {
  return { gridColumn: `${span.start + 1} / ${span.end + 2}`, gridRow: row };
}

function describe(phrase: Phrase): string {
  const lyrics = phrase.syllables.map((syllable) => syllable.text).join(" ");
  return lyrics.replace(/- /g, "") || "Music notation";
}

function CellView({ cell, column }: { cell: Cell; column: number }) {
  const style = place({ start: column, end: column }, ROW.cell);

  switch (cell.kind) {
    case "bar":
      return <span style={style} className={cell.final ? "nt-bar nt-bar-final" : "nt-bar"} />;
    case "breath":
      return (
        <span style={style} className="nt-cell nt-breath">
          ’
        </span>
      );
    case "sustain":
      return (
        <span style={style} className="nt-cell">
          <span className="nt-digit">.</span>
        </span>
      );
    case "rest":
      return (
        <span style={style} className="nt-cell">
          <span className="nt-digit">0</span>
        </span>
      );
    case "note":
      return (
        <span style={style} className="nt-cell">
          {cell.fermata && <span className="nt-fermata" />}
          {cell.octave > 0 && <span className="nt-dots nt-dots-up">{"•".repeat(cell.octave)}</span>}
          <span className="nt-digit" data-accidental={cell.accidental ?? undefined}>
            {cell.degree}
          </span>
          {cell.octave < 0 && <span className="nt-dots nt-dots-down">{"•".repeat(-cell.octave)}</span>}
        </span>
      );
  }
}

// Renders one phrase of cipher notation with its lyrics. Sizes follow the font size.
export function Notation({ phrase }: { phrase: Phrase }) {
  return (
    <div className="notation" role="img" aria-label={describe(phrase)}>
      {phrase.beams.map((beam) => (
        <span
          key={`beam-${beam.level}-${beam.start}`}
          className="nt-beam"
          style={place(beam, beam.level === 2 ? ROW.beam2 : ROW.beam1)}
        />
      ))}
      {phrase.cells.map((cell, column) => (
        <CellView key={column} cell={cell} column={column} />
      ))}
      {phrase.slurs.map((slur) => (
        <span key={`slur-${slur.start}-${slur.end}`} className="nt-slur" style={place(slur, ROW.slur)} />
      ))}
      {phrase.syllables.map((syllable) => (
        <span key={`lyric-${syllable.start}`} className="nt-lyric" style={place(syllable, ROW.lyric)}>
          {syllable.text}
        </span>
      ))}
    </div>
  );
}
