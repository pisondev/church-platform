import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages, testSession } from "@/test-utils";

import { SessionGate } from "./session-gate";

const fetchMock = vi.fn<typeof fetch>();

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function renderGate() {
  return renderWithMessages(
    <SessionGate>
      <p>Private page</p>
    </SessionGate>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("asks the API for the session with credentials", async () => {
  fetchMock.mockResolvedValue(json(200, testSession));
  renderGate();

  expect(screen.getByRole("status")).toHaveTextContent(messages.Session.loading);
  await screen.findByText("Private page");
  expect(fetchMock).toHaveBeenCalledWith(`${siteConfig.apiUrl}/api/v1/auth/me`, { credentials: "include" });
});

test("shows the page and the user to a signed-in user", async () => {
  fetchMock.mockResolvedValue(json(200, testSession));
  renderGate();

  expect(await screen.findByText("Private page")).toBeInTheDocument();
  expect(screen.getByText("Admin Person")).toBeInTheDocument();
  expect(screen.getByText(messages.Session.superAdmin)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.Nav.songs })).toHaveAttribute("href", "/songs");
});

test("labels a user who is not a Super Admin as Church Admin", async () => {
  fetchMock.mockResolvedValue(json(200, { ...testSession, user: { ...testSession.user, isSuperAdmin: false } }));
  renderGate();

  expect(await screen.findByText(messages.Session.churchAdmin)).toBeInTheDocument();
});

test("hides the page and offers sign-in to a signed-out visitor", async () => {
  fetchMock.mockResolvedValue(json(401));
  renderGate();

  expect(await screen.findByRole("link", { name: messages.Session.signIn })).toHaveAttribute(
    "href",
    `${siteConfig.webUrl}/login`,
  );
  expect(screen.queryByText("Private page")).not.toBeInTheDocument();
});

test("reports an unreachable server and retries on request", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("network down"));
  fetchMock.mockResolvedValue(json(200, testSession));
  renderGate();

  expect(await screen.findByText(messages.Session.errorTitle)).toBeInTheDocument();
  expect(screen.queryByText("Private page")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: messages.Session.retry }));

  expect(await screen.findByText("Private page")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("signs out through the API and closes the page", async () => {
  fetchMock.mockResolvedValueOnce(json(200, testSession));
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
  renderGate();

  fireEvent.click(await screen.findByRole("button", { name: messages.Session.signOut }));

  expect(await screen.findByText(messages.Session.signedOutTitle)).toBeInTheDocument();
  expect(screen.queryByText("Private page")).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(`${siteConfig.apiUrl}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
});
