import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

test("header links the brand home and the public pages", () => {
  renderWithMessages(<SiteHeader />);

  const header = within(screen.getByRole("banner"));
  expect(header.getByRole("link", { name: siteConfig.name })).toHaveAttribute("href", "/");
  expect(header.getByRole("link", { name: messages.Nav.about })).toHaveAttribute("href", "/about");
  expect(header.getByRole("link", { name: messages.Nav.contact })).toHaveAttribute("href", "/contact");
});

test("header sends sign in to the admin app", () => {
  renderWithMessages(<SiteHeader />);

  expect(screen.getByRole("link", { name: messages.Nav.signIn })).toHaveAttribute(
    "href",
    siteConfig.adminUrl,
  );
});

test("footer links the legal pages", () => {
  renderWithMessages(<SiteFooter />);

  const legal = within(screen.getByRole("navigation", { name: "Legal" }));
  expect(legal.getByRole("link", { name: messages.Nav.privacy })).toHaveAttribute("href", "/privacy");
  expect(legal.getByRole("link", { name: messages.Nav.terms })).toHaveAttribute("href", "/terms");
  expect(legal.getByRole("link", { name: messages.Nav.contact })).toHaveAttribute("href", "/contact");
});
