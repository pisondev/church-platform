import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import HomePage from "./page";

test("shows the panel title and the product name", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.Home.title);
  expect(screen.getByText(siteConfig.name)).toBeInTheDocument();
});

test("says sign-in is not available yet", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("status")).toHaveTextContent(messages.Home.signInUnavailable);
});

test("links back to the public site", () => {
  renderWithMessages(<HomePage />);

  expect(screen.getByRole("link", { name: messages.Home.backToSite })).toHaveAttribute(
    "href",
    siteConfig.webUrl,
  );
});
