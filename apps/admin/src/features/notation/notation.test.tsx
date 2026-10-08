import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Notation } from "./notation";
import { parsePhrase } from "./parse";

const phrase = parsePhrase("5, | 1 . [(3 1)] | #4 1' ||", "A- jaib be- nar ya");

test("draws every mark of the phrase", () => {
  const { container } = render(<Notation phrase={phrase} />);
  const count = (selector: string) => container.querySelectorAll(selector).length;

  expect(count(".nt-beam")).toBe(1);
  expect(count(".nt-slur")).toBe(1);
  expect(count(".nt-bar")).toBe(3);
  expect(count(".nt-bar-final")).toBe(1);
  expect(count(".nt-dots-down")).toBe(1);
  expect(count(".nt-dots-up")).toBe(1);
  expect(container.querySelector('[data-accidental="sharp"]')).toHaveTextContent("4");
});

test("names the phrase by its words for assistive technology", () => {
  render(<Notation phrase={phrase} />);

  expect(screen.getByRole("img", { name: "Ajaib benar ya" })).toBeInTheDocument();
});

test("stretches a syllable under its note and sustain", () => {
  render(<Notation phrase={phrase} />);

  expect(screen.getByText("jaib")).toHaveStyle({ gridColumn: "3 / 5", gridRow: "5" });
  expect(screen.getByText("be-")).toHaveStyle({ gridColumn: "5 / 7" });
});
