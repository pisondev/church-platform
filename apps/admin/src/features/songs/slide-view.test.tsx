import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { findSong } from "./library";
import { SlideView } from "./slide-view";
import { buildSongSlides } from "./slides";

const slidesOf = (id: string, verses: string[] = []) => buildSongSlides(findSong(id)!, verses);

test("the title slide of a hymn names its book, its number, the verses and its title", () => {
  render(<SlideView slide={slidesOf("nr-3")[0]} />);

  expect(screen.getByText("Nyanyian Rohani")).toBeInTheDocument();
  expect(screen.getByText("NR 3 : 1, 2")).toBeInTheDocument();
  expect(screen.getByText("“Hormat bagi Allah Bapa”")).toBeInTheDocument();
});

test("a song that is one piece shows its number without verses", () => {
  render(<SlideView slide={slidesOf("nkb-225")[0]} />);

  expect(screen.getByText("NKB 225")).toBeInTheDocument();
  expect(screen.queryByText(/:/)).not.toBeInTheDocument();
});

test("a response from no book shows its title alone", () => {
  const { container } = render(<SlideView slide={slidesOf("haleluya-amin")[0]} />);

  expect(screen.getByText("“Haleluya, Amin”")).toBeInTheDocument();
  expect(container.querySelectorAll("p")).toHaveLength(1);
});

test("a verse slide carries the number of its verse, a refrain slide says so", () => {
  const slides = slidesOf("kp-102");
  const verse = render(<SlideView slide={slides[1]} />);

  expect(screen.getByText("KP 102")).toBeInTheDocument();
  expect(verse.container.querySelector("footer")).toHaveTextContent(/^1$/);
  verse.unmount();

  const refrain = render(<SlideView slide={slides.at(-1)!} />);
  expect(refrain.container.querySelector("footer")).toHaveTextContent(/^Refrein$/);
});

test("a slide of a song that is one piece carries no verse number", () => {
  const { container } = render(<SlideView slide={slidesOf("haleluya-amin")[1]} />);

  expect(container.querySelector("footer")).toBeEmptyDOMElement();
  // No book either: the header starts with the title.
  expect(container.querySelector("header p")).toHaveTextContent(/^Haleluya, Amin$/);
});

test("a triplet in a song is drawn with its mark", () => {
  // The second half of PKJ 15 opens with "Firman-Mu, Tuhan, tiada berubah".
  const slide = slidesOf("pkj-15").find(
    (part) => part.kind === "phrases" && part.phrases.some((phrase) => phrase.notes.includes("{")),
  )!;
  render(<SlideView slide={slide} />);

  // Among the notes there are plain 3s too: the mark is the one on the row above them all.
  const marks = screen.getAllByText("3").filter((element) => element.parentElement?.style.gridRow === "1");
  expect(marks).toHaveLength(1);
});
