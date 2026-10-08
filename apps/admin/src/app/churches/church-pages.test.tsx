import { screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithMessages } from "@/test-utils";

import ChurchPage from "./[slug]/page";
import TemplatePage from "./[slug]/templates/[id]/page";

const church = { id: "church-1", name: "GKJ Sentolo", slug: "gkj-sentolo", status: "active" };
const summary = { id: "tpl-1", name: "Liturgi Umum", aspectRatio: "16:9", slideCount: 3, updatedAt: "2026-10-08T00:00:00Z" };
const template = {
  ...summary,
  slides: [
    { id: "s1", position: 1, kind: "cover", content: { title: "Selamat Datang" } },
    { id: "s2", position: 2, kind: "section", content: { title: "Votum" } },
    { id: "s3", position: 3, kind: "song", content: {} },
  ],
};

let params: Record<string, string> = {};
vi.mock("next/navigation", () => ({ useParams: () => params }));

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("church page lists the templates and links to each", async () => {
  params = { slug: "gkj-sentolo" };
  fetchMock.mockResolvedValue(json(200, { church, templates: [summary] }));
  renderWithMessages(<ChurchPage />);

  expect(screen.getByRole("status")).toHaveTextContent(messages.Resource.loading);
  expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("GKJ Sentolo");
  expect(screen.getByRole("link", { name: /Liturgi Umum/ })).toHaveAttribute(
    "href",
    "/churches/gkj-sentolo/templates/tpl-1",
  );
  expect(screen.getByText("3 slides · 16:9")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`${siteConfig.apiUrl}/api/v1/churches/gkj-sentolo/templates`, {
    credentials: "include",
  });
});

test("church page says so when there are no templates", async () => {
  params = { slug: "gkj-sentolo" };
  fetchMock.mockResolvedValue(json(200, { church, templates: [] }));
  renderWithMessages(<ChurchPage />);

  expect(await screen.findByText(messages.Church.noTemplates)).toBeInTheDocument();
});

test("church page reports a church the user cannot see", async () => {
  params = { slug: "other" };
  fetchMock.mockResolvedValue(json(404));
  renderWithMessages(<ChurchPage />);

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.Resource.notFound);
});

test("church page reports an unreachable server", async () => {
  params = { slug: "gkj-sentolo" };
  fetchMock.mockRejectedValue(new TypeError("network down"));
  renderWithMessages(<ChurchPage />);

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.Resource.error);
});

test("template page shows the template and its slides as a slideshow", async () => {
  params = { slug: "gkj-sentolo", id: "tpl-1" };
  fetchMock.mockResolvedValue(json(200, { church, template }));
  renderWithMessages(<TemplatePage />);

  expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Liturgi Umum");
  expect(screen.getByText("Slide 1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "GKJ Sentolo" })).toHaveAttribute("href", "/churches/gkj-sentolo");
  expect(screen.getAllByText("Selamat Datang").length).toBeGreaterThan(0);
  expect(fetchMock).toHaveBeenCalledWith(`${siteConfig.apiUrl}/api/v1/churches/gkj-sentolo/templates/tpl-1`, {
    credentials: "include",
  });
});
