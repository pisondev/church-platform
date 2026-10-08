import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import HomePage from "./page";

test("shows the headline and the tagline", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.Home.title);
  expect(screen.getByText(siteConfig.tagline)).toBeInTheDocument();
});

test("lists every feature", () => {
  renderWithMessages(<HomePage />);

  const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
  expect(headings).toEqual(Object.values(messages.Home.features).map((feature) => feature.title));
});
