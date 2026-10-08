import { screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { messages, renderWithMessages } from "@/test-utils";

import { FrameView } from "./frame-view";
import { buildFrames } from "./frames";
import type { Church, TemplateSlide } from "./types";

// Friday 9 October 2026: the coming Sunday is the 11th, the second of the month.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 9, 10));
});

afterEach(() => {
  vi.useRealTimers();
});

const cover: TemplateSlide = {
  id: "1",
  position: 1,
  kind: "cover",
  content: {
    title: "Ibadah Minggu ke-{n}",
    subtitle: "Selamat Datang",
    footer: "Handphone mohon dimatikan atau *silent*",
  },
};

function renderSlide(slide: TemplateSlide, frame = 0, church?: Pick<Church, "name" | "slug">) {
  return renderWithMessages(<FrameView frame={buildFrames([slide])[frame]} church={church} />);
}

test("the cover of a church with a logo is a bumper: logo, numbered title, date and notice", () => {
  const { container } = renderSlide(cover, 0, { name: "GKJ Sentolo", slug: "gkj-sentolo" });

  // The moving backdrop lies behind it, before it in the frame.
  expect(container.querySelector(".slide-frame [aria-hidden=true] svg path")).toBeInTheDocument();

  expect(screen.getByRole("img", { name: "GKJ Sentolo logo" })).toHaveAttribute("src", "/logos/gkj-sentolo.webp");
  expect(screen.getByText("Ibadah Minggu ke-2")).toBeInTheDocument();
  expect(screen.getByText("Minggu, 11 Oktober 2026")).toBeInTheDocument();
  expect(screen.getByText(/^Handphone mohon dimatikan atau/)).toBeInTheDocument();
  expect(screen.getByText("silent").tagName).toBe("EM");
  // The subtitle has no place in the bumper yet.
  expect(screen.queryByText("Selamat Datang")).not.toBeInTheDocument();
});

test("the cover of a church without a logo shows its numbered title, subtitle and footer", () => {
  const { container } = renderSlide(cover, 0, { name: "GKJ Contoh", slug: "gkj-contoh" });

  expect(container.querySelector("svg")).not.toBeInTheDocument();

  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Ibadah Minggu ke-2")).toBeInTheDocument();
  expect(screen.getByText("Selamat Datang")).toBeInTheDocument();
  expect(screen.getByText(/^Handphone mohon dimatikan atau/)).toHaveTextContent("Handphone mohon dimatikan atau silent");
  expect(screen.getByText("silent").tagName).toBe("EM");
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
