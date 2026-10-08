import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import HomePage from "./page";

test("shows the headline and the product name", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.Home.title);
  expect(screen.getByRole("banner")).toHaveTextContent(siteConfig.name);
});

test("lists every feature", () => {
  renderWithMessages(<HomePage />);

  const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
  expect(headings).toEqual(Object.values(messages.Home.features).map((feature) => feature.title));
});

test("links sign in to the admin app", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("link", { name: messages.Header.signIn })).toHaveAttribute(
    "href",
    siteConfig.adminUrl,
  );
});
