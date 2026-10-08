import { screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { siteConfig } from "@/config/site";
import { messages, renderWithSession } from "@/test-utils";

import TemplatePage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "gkj-sentolo", id: "tpl-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

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

test("loads the template and opens it in the editor", async () => {
  fetchMock.mockResolvedValue(
    json(200, {
      church: { id: "church-1", name: "GKJ Sentolo", slug: "gkj-sentolo", status: "active" },
      template: {
        id: "tpl-1",
        name: "Liturgi Umum",
        aspectRatio: "16:9",
        slideCount: 1,
        updatedAt: "2026-10-08T00:00:00Z",
        slides: [{ id: "s1", position: 1, kind: "cover", content: { title: "Selamat Datang" } }],
      },
    }),
  );
  renderWithSession(<TemplatePage />);

  expect(await screen.findByRole("textbox", { name: messages.Editor.titleLabel })).toHaveValue("Liturgi Umum");
  expect(screen.getByText("Slide 1 of 1 · Cover")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(`${siteConfig.apiUrl}/api/v1/churches/gkj-sentolo/templates/tpl-1`, {
    credentials: "include",
  });
});

test("reports a template the user cannot see", async () => {
  fetchMock.mockResolvedValue(json(404));
  renderWithSession(<TemplatePage />);

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.Resource.notFound);
});
