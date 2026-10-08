import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { messages, renderWithMessages } from "@/test-utils";

import { FrameView } from "./frame-view";
import { buildFrames } from "./frames";
import type { Church, TemplateSlide } from "./types";

function renderSlide(slide: TemplateSlide, frame = 0, church?: Pick<Church, "name" | "slug">) {
  return renderWithMessages(<FrameView frame={buildFrames([slide])[frame]} church={church} />);
}

test("the cover of a church with a logo is a bumper: the logo, without the text", () => {
  renderSlide({ id: "1", position: 1, kind: "cover", content: { title: "Selamat Datang" } }, 0, {
    name: "GKJ Sentolo",
    slug: "gkj-sentolo",
  });

  expect(screen.getByRole("img", { name: "GKJ Sentolo logo" })).toHaveAttribute("src", "/logos/gkj-sentolo.webp");
  expect(screen.queryByText("Selamat Datang")).not.toBeInTheDocument();
});

test("the cover of a church without a logo shows its title, subtitle and footer", () => {
  renderSlide(
    {
      id: "1",
      position: 1,
      kind: "cover",
      content: { title: "Selamat Datang", subtitle: "Ibadah Minggu", footer: "Handphone mohon dimatikan" },
    },
    0,
    { name: "GKJ Contoh", slug: "gkj-contoh" },
  );

  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Selamat Datang")).toBeInTheDocument();
  expect(screen.getByText("Ibadah Minggu")).toBeInTheDocument();
  expect(screen.getByText("Handphone mohon dimatikan")).toBeInTheDocument();
});

test("section shows its title and optional subtitle", () => {
  renderSlide({ id: "1", position: 1, kind: "section", content: { title: "Votum", subtitle: "Jemaat berdiri" } });

  expect(screen.getByText("Votum")).toBeInTheDocument();
  expect(screen.getByText("Jemaat berdiri")).toBeInTheDocument();
});

test.each([
  ["song", messages.Templates.slots.song],
  ["scripture", messages.Templates.slots.scripture],
] as const)("an empty %s slot is labelled as a placeholder", (kind, label) => {
  renderSlide({ id: "1", position: 1, kind, content: {} });

  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText(messages.Templates.slots.hint)).toBeInTheDocument();
});

test("responsive reading shows each line with its role, colored by role", () => {
  renderSlide({
    id: "1",
    position: 1,
    kind: "responsive_reading",
    content: {
      title: "Pengutusan",
      lines: [
        { role: "P", text: "Jadilah saksi Kristus." },
        { role: "J", text: "Syukur kepada Tuhan." },
      ],
    },
  });

  expect(screen.getByText("Pengutusan")).toBeInTheDocument();
  const leader = screen.getByText("Jadilah saksi Kristus.").closest("li");
  const people = screen.getByText("Syukur kepada Tuhan.").closest("li");
  expect(leader).toHaveTextContent("P");
  expect(people).toHaveTextContent("J");
  expect(leader?.style.color).not.toBe(people?.style.color);
});

test("a long reading numbers its frames", () => {
  const lines = Array.from({ length: 9 }, (_, index) => ({ role: "P+J", text: `Baris ${index + 1}` }));
  renderSlide({ id: "1", position: 1, kind: "responsive_reading", content: { title: "Sahadat", lines } }, 1);

  expect(screen.getByText("2 / 2")).toBeInTheDocument();
  expect(screen.getByText("Baris 7")).toBeInTheDocument();
  expect(screen.queryByText("Baris 1")).not.toBeInTheDocument();
});
