import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { messages, renderWithSession, testSession } from "@/test-utils";

import { AppShell } from "./app-shell";

test("shows the navigation, the user and their role around the page", () => {
  renderWithSession(
    <AppShell>
      <p>Page body</p>
    </AppShell>,
  );

  expect(screen.getByText("Page body")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.Nav.songs })).toHaveAttribute("href", "/songs");
  expect(screen.getByText("Admin Person")).toBeInTheDocument();
  expect(screen.getByText(messages.Session.superAdmin)).toBeInTheDocument();
});

test("labels a user who is not a Super Admin as Church Admin", () => {
  renderWithSession(<AppShell>{null}</AppShell>, {
    ...testSession,
    user: { ...testSession.user, isSuperAdmin: false },
  });

  expect(screen.getByText(messages.Session.churchAdmin)).toBeInTheDocument();
});

test("signs out from the header", () => {
  const signOut = vi.fn();
  renderWithSession(<AppShell>{null}</AppShell>, testSession, signOut);

  fireEvent.click(screen.getByRole("button", { name: messages.Session.signOut }));

  expect(signOut).toHaveBeenCalledOnce();
});
