import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { siteConfig } from "@/config/site";
import type { Church, Template } from "@/features/templates/types";
import { messages, renderWithSession } from "@/test-utils";

import { TemplateEditor } from "./template-editor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const church: Church = { id: "church-1", name: "GKJ Sentolo", slug: "gkj-sentolo", status: "active" };

const creedLines = Array.from({ length: 9 }, (_, index) => ({ role: "P+J", text: `Baris ${index + 1}` }));

const template: Template = {
  id: "tpl-1",
  name: "Liturgi Umum",
  aspectRatio: "16:9",
  slideCount: 4,
  updatedAt: "2026-10-08T00:00:00Z",
  slides: [
    { id: "s1", position: 1, kind: "cover", content: { title: "Selamat Datang" } },
    { id: "s2", position: 2, kind: "section", content: { title: "Votum" } },
    { id: "s3", position: 3, kind: "song", content: {} },
    { id: "s4", position: 4, kind: "responsive_reading", content: { title: "Sahadat", lines: creedLines } },
  ],
};

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderEditor(value: Template = template) {
  return renderWithSession(<TemplateEditor church={church} template={value} />);
}

const stage = () => within(screen.getByRole("main"));
const strip = () => within(screen.getByRole("navigation", { name: messages.Editor.filmstrip }));
const title = () => screen.getByRole("textbox", { name: messages.Editor.titleLabel });
const press = (key: string) => fireEvent.keyDown(window, { key });

function chooseCommand(menu: string, command: string) {
  fireEvent.click(screen.getByRole("menuitem", { name: menu }));
  fireEvent.click(screen.getByRole("menuitem", { name: command }));
}

test("header has the logo back to the church, the name, the menus and the account", () => {
  renderEditor();

  expect(screen.getByRole("link", { name: "Back to GKJ Sentolo" })).toHaveAttribute("href", "/churches/gkj-sentolo");
  expect(title()).toHaveValue("Liturgi Umum");
  expect(screen.getByRole("menubar", { name: messages.Editor.menubar })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: messages.Editor.slideshow })).toBeEnabled();
  expect(screen.getByRole("img", { name: "Signed in as Admin Person" })).toBeInTheDocument();
});

test("starts on the first slide, with every slide in the filmstrip", () => {
  renderEditor();

  expect(stage().getByText("Selamat Datang")).toBeInTheDocument();
  expect(screen.getByText("Slide 1 of 4 · Cover")).toBeInTheDocument();
  expect(strip().getAllByRole("button", { name: /^Slide \d+:/ })).toHaveLength(4);
  expect(strip().getByRole("button", { name: "Slide 1: Cover" })).toHaveAttribute("aria-current", "true");
});

test("a click in the filmstrip shows that slide on the stage", () => {
  renderEditor();

  fireEvent.click(strip().getByRole("button", { name: "Slide 2: Section" }));

  expect(stage().getByText("Votum")).toBeInTheDocument();
  expect(screen.getByText("Slide 2 of 4 · Section")).toBeInTheDocument();
  expect(strip().getByRole("button", { name: "Slide 2: Section" })).toHaveAttribute("aria-current", "true");
  expect(strip().getByRole("button", { name: "Slide 1: Cover" })).not.toHaveAttribute("aria-current");
});

test("the keyboard moves between slides and stops at both ends", () => {
  renderEditor();

  press("ArrowRight");
  press("PageDown");
  expect(screen.getByText("Slide 3 of 4 · Song")).toBeInTheDocument();

  press("End");
  press("ArrowRight");
  expect(screen.getByText("Slide 4 of 4 · Responsive reading")).toBeInTheDocument();

  press("Home");
  press("ArrowLeft");
  expect(screen.getByText("Slide 1 of 4 · Cover")).toBeInTheDocument();
});

test("arrow keys stay in the name field while it is being edited", () => {
  renderEditor();

  fireEvent.keyDown(title(), { key: "ArrowRight" });

  expect(screen.getByText("Slide 1 of 4 · Cover")).toBeInTheDocument();
});

test("the Slide menu moves through the slides", () => {
  renderEditor();

  chooseCommand(messages.Editor.menus.slide, messages.Editor.commands.last);
  expect(screen.getByText("Slide 4 of 4 · Responsive reading")).toBeInTheDocument();

  chooseCommand(messages.Editor.menus.slide, messages.Editor.commands.previous);
  expect(screen.getByText("Slide 3 of 4 · Song")).toBeInTheDocument();
});

test("a reading that takes several screens can be paged through on the stage", () => {
  renderEditor();
  press("End");

  expect(screen.getByText("Screen 1 of 2")).toBeInTheDocument();
  expect(stage().getByText("Baris 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: messages.Editor.nextScreen }));

  expect(screen.getByText("Screen 2 of 2")).toBeInTheDocument();
  expect(stage().getByText("Baris 9")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: messages.Editor.nextScreen })).toBeDisabled();
});

test("renaming saves through the API and confirms it", async () => {
  fetchMock.mockResolvedValue(json(200, { template: { ...template, name: "Liturgi Natal" } }));
  renderEditor();

  fireEvent.change(title(), { target: { value: "  Liturgi Natal " } });
  fireEvent.blur(title());

  expect(await screen.findByText(messages.Editor.saved)).toBeInTheDocument();
  expect(title()).toHaveValue("Liturgi Natal");
  expect(fetchMock).toHaveBeenCalledWith(`${siteConfig.apiUrl}/api/v1/churches/gkj-sentolo/templates/tpl-1`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Liturgi Natal" }),
  });
});

test("a name that is already used is refused and the old name comes back", async () => {
  fetchMock.mockResolvedValue(json(409, { error: { code: "name_taken", message: "taken" } }));
  renderEditor();

  fireEvent.change(title(), { target: { value: "Liturgi Paskah" } });
  fireEvent.blur(title());

  expect(await screen.findByRole("alert")).toHaveTextContent(messages.Editor.errors.name_taken);
  expect(title()).toHaveValue("Liturgi Umum");
});

test("leaving the name unchanged or pressing Escape saves nothing", () => {
  renderEditor();

  fireEvent.blur(title());
  fireEvent.change(title(), { target: { value: "Something else" } });
  fireEvent.keyDown(title(), { key: "Escape" });

  expect(title()).toHaveValue("Liturgi Umum");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("File > Rename puts the cursor in the name field", () => {
  renderEditor();

  chooseCommand(messages.Editor.menus.file, messages.Editor.commands.rename);

  expect(title()).toHaveFocus();
});

test("File > Back goes to the church page", () => {
  renderEditor();

  chooseCommand(messages.Editor.menus.file, "Back to GKJ Sentolo");

  expect(push).toHaveBeenCalledWith("/churches/gkj-sentolo");
});

test("Slideshow presents from the selected slide and Escape closes it", async () => {
  renderEditor();
  press("ArrowRight");

  fireEvent.click(screen.getByRole("button", { name: messages.Editor.slideshow }));
  const show = within(screen.getByRole("dialog", { name: messages.Editor.presenting }));
  expect(show.getByText("Votum")).toBeInTheDocument();

  press("ArrowRight");
  expect(show.getByText(messages.Templates.slots.song)).toBeInTheDocument();

  // Keys belong to the slideshow now: the editor behind it must not move.
  press("Escape");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("Slide 2 of 4 · Section")).toBeInTheDocument();
});

test("View > Slideshow from the first slide starts at the cover", () => {
  renderEditor();
  press("End");

  chooseCommand(messages.Editor.menus.view, messages.Editor.commands.presentFromStart);

  expect(within(screen.getByRole("dialog")).getByText("Selamat Datang")).toBeInTheDocument();
});

test("the slideshow shows every screen of a long reading", () => {
  renderEditor();
  press("End");
  fireEvent.click(screen.getByRole("button", { name: messages.Editor.slideshow }));
  const show = within(screen.getByRole("dialog"));

  expect(show.getByText("Baris 1")).toBeInTheDocument();
  press("ArrowRight");
  expect(show.getByText("Baris 9")).toBeInTheDocument();
});

test("the slide panel closes from its own button and comes back from the status line", () => {
  renderEditor();

  fireEvent.click(screen.getByRole("button", { name: messages.Editor.hidePanel }));

  expect(screen.queryByRole("navigation", { name: messages.Editor.filmstrip })).not.toBeInTheDocument();
  expect(stage().getByText("Selamat Datang")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: messages.Editor.showPanel }));

  expect(strip().getAllByRole("button", { name: /^Slide \d+:/ })).toHaveLength(4);
  expect(screen.queryByRole("button", { name: messages.Editor.showPanel })).not.toBeInTheDocument();
});

test("the View menu hides and shows the slide panel", () => {
  renderEditor();

  chooseCommand(messages.Editor.menus.view, messages.Editor.commands.hidePanel);
  expect(screen.queryByRole("navigation", { name: messages.Editor.filmstrip })).not.toBeInTheDocument();

  chooseCommand(messages.Editor.menus.view, messages.Editor.commands.showPanel);
  expect(screen.getByRole("navigation", { name: messages.Editor.filmstrip })).toBeInTheDocument();
});

test("slides can still be changed from the keyboard while the panel is closed", () => {
  renderEditor();
  fireEvent.click(screen.getByRole("button", { name: messages.Editor.hidePanel }));

  press("ArrowRight");

  expect(screen.getByText("Slide 2 of 4 · Section")).toBeInTheDocument();
});

test("the stage sizes the slide itself, without help from a stylesheet", () => {
  renderEditor();

  const main = screen.getByRole("main");
  expect(main.style.containerType).toBe("size");
  expect((main.firstElementChild as HTMLElement).style.width).toContain("100cqh");
});

test("an empty template says so and cannot be presented", () => {
  renderEditor({ ...template, slideCount: 0, slides: [] });

  expect(screen.getByText(messages.Editor.empty)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: messages.Editor.slideshow })).toBeDisabled();

  // The panel can still be closed and brought back.
  fireEvent.click(screen.getByRole("button", { name: messages.Editor.hidePanel }));
  expect(screen.getByRole("button", { name: messages.Editor.showPanel })).toBeInTheDocument();
});
