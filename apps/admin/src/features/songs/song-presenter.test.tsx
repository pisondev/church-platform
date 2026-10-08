import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithMessages } from "@/test-utils";

import { kj40 } from "./data/kj-40";
import { SongPresenter } from "./song-presenter";

// KJ 40: a title slide, then three verses of four phrases at two phrases per slide.
const TOTAL = 7;

const position = (current: number, total = TOTAL) => screen.getByText(`Slide ${current} of ${total}`);
const press = (key: string) => fireEvent.keyDown(window, { key });

test("starts on the title slide of every verse", () => {
  renderWithMessages(<SongPresenter song={kj40} />);

  expect(position(1)).toBeInTheDocument();
  // Shown on the stage and again in its thumbnail.
  const titles = screen.getAllByText((_, element) => element?.textContent === "KJ 40 : 1, 2, 3");
  expect(titles.length).toBeGreaterThan(0);
});

test("moves with the keyboard and stops at both ends", () => {
  renderWithMessages(<SongPresenter song={kj40} />);

  press("ArrowRight");
  press("PageDown");
  press(" ");
  expect(position(4)).toBeInTheDocument();

  press("ArrowLeft");
  expect(position(3)).toBeInTheDocument();

  press("End");
  press("ArrowRight");
  expect(position(TOTAL)).toBeInTheDocument();

  press("Home");
  press("PageUp");
  expect(position(1)).toBeInTheDocument();
});

test("moves with the buttons, a click on the slide and the thumbnails", () => {
  renderWithMessages(<SongPresenter song={kj40} />);

  fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
  expect(position(2)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Go to slide 5" }));
  expect(position(5)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Go to slide 5" })).toHaveAttribute("aria-current", "true");

  fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
  expect(position(4)).toBeInTheDocument();
});

test("leaves keys to form fields", () => {
  renderWithMessages(<SongPresenter song={kj40} />);

  fireEvent.keyDown(screen.getByRole("checkbox", { name: "Verse 1" }), { key: " " });
  expect(position(1)).toBeInTheDocument();
});

test("rebuilds the slides when a verse is removed, keeping at least one", () => {
  renderWithMessages(<SongPresenter song={kj40} />);

  fireEvent.click(screen.getByRole("checkbox", { name: "Verse 3" }));
  expect(position(1, 5)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("checkbox", { name: "Verse 2" }));
  expect(position(1, 3)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Verse 1" })).toBeDisabled();
});
