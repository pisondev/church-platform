import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { messages, renderWithSession, testSession } from "@/test-utils";

import HomePage from "./page";

test("greets the signed-in user by name", () => {
  renderWithSession(<HomePage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome, Admin Person");
});

test("falls back to the email when the profile has no name", () => {
  renderWithSession(<HomePage />, { ...testSession, user: { ...testSession.user, name: "" } });

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome, admin");
});

test("lists the churches the user manages", () => {
  renderWithSession(<HomePage />);

  expect(screen.getByRole("link", { name: /GKJ Sentolo/ })).toHaveAttribute("href", "/churches/gkj-sentolo");
  expect(screen.queryByText(messages.Home.noChurches)).not.toBeInTheDocument();
});

test("says so when no church is assigned", () => {
  renderWithSession(<HomePage />, { ...testSession, churches: [] });

  expect(screen.getByText(messages.Home.noChurches)).toBeInTheDocument();
});

test("links to the song library", () => {
  renderWithSession(<HomePage />);

  expect(screen.getByRole("link", { name: messages.Home.openSongs })).toHaveAttribute("href", "/songs");
});
