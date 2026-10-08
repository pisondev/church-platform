import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import LoginPage from "./page";

let query = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

beforeEach(() => {
  query = "";
});

test("sends the Google button to the API sign-in endpoint", () => {
  renderWithMessages(<LoginPage />);

  expect(screen.getByRole("link", { name: messages.Login.google })).toHaveAttribute(
    "href",
    `${siteConfig.apiUrl}/api/v1/auth/google/start`,
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("explains a known sign-in failure", () => {
  query = "error=not_registered";
  renderWithMessages(<LoginPage />);

  expect(screen.getByRole("alert")).toHaveTextContent(messages.Login.errors.not_registered);
});

test("falls back to a general message for an unknown reason", () => {
  query = "error=something_new";
  renderWithMessages(<LoginPage />);

  expect(screen.getByRole("alert")).toHaveTextContent(messages.Login.errors.unknown);
});
