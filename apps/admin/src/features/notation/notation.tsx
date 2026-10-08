import type { CSSProperties } from "react";

import type { Cell, Phrase, Span } from "./parse";

// Grid rows of a phrase, top to bottom. Columns are one per cell and size to their content,
// so a long syllable widens its own column and everything stays aligned.
const ROW = { beam2: 1, beam1: 2, cell: 3, slur: 4, lyric: 5 } as const;

// A phrase with triplets gets one more row on top for their marks. The stylesheet knows
// five rows, so the six are set here.
const ROWS_WITH_TUPLETS: CSSProperties = { gridTemplateRows: "0.78em 0.18em 0.18em auto 0.34em auto" };

function place(span: Span, row: number): CSSProperties {
  return { gridColumn: `${span.start + 1} / ${span.end + 2}`, gridRow: row };
}

function describe(phrase: Phrase): string {
  const lyrics = phrase.syllables.map((syllable) => syllable.text).join(" ");
  return lyrics.replace(/- /g, "") || "Music notation";
}

// A triplet mark: an arc over the notes with a 3 above it.
function TupletMark({ span }: { span: Span }) {
  return (
    <span className="relative self-stretch justify-self-stretch" style={place(span, 1)}>
      {/* The label is small, so its own em is too: 0.85em here is about 0.37em of the notes. */}
      <span className="absolute bottom-[0.85em] left-1/2 -translate-x-1/2 text-[0.44em] leading-none font-bold">3</span>
      <span className="absolute inset-x-[0.25em] bottom-[0.04em] h-[0.26em] rounded-t-[0.6em] border-[0.06em] border-b-0 border-current" />
    </span>
  );
}

function CellView({ cell, column, row }: { cell: Cell; column: number; row: number }) {
  const style = place({ start: column, end: column }, row);

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
  const hasTuplets = phrase.tuplets.length > 0;
  // Every other row moves down by one when the row of triplet marks is there.
  const row = (name: keyof typeof ROW) => ROW[name] + (hasTuplets ? 1 : 0);

  return (
    <div
      className="notation"
      role="img"
      aria-label={describe(phrase)}
      style={hasTuplets ? ROWS_WITH_TUPLETS : undefined}
    >
      {phrase.tuplets.map((tuplet) => (
        <TupletMark key={`tuplet-${tuplet.start}`} span={tuplet} />
      ))}
      {phrase.beams.map((beam) => (
        <span
          key={`beam-${beam.level}-${beam.start}`}
          className="nt-beam"
          style={place(beam, row(beam.level === 2 ? "beam2" : "beam1"))}
        />
      ))}
      {phrase.cells.map((cell, column) => (
        <CellView key={column} cell={cell} column={column} row={row("cell")} />
      ))}
      {phrase.slurs.map((slur) => (
        <span key={`slur-${slur.start}-${slur.end}`} className="nt-slur" style={place(slur, row("slur"))} />
      ))}
      {phrase.syllables.map((syllable) => (
        <span key={`lyric-${syllable.start}`} className="nt-lyric" style={place(syllable, row("lyric"))}>
          {syllable.text}
        </span>
      ))}
    </div>
  );
}
