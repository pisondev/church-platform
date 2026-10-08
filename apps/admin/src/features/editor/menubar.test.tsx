import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Menubar, type MenuGroup } from "./menubar";

function setup() {
  const rename = vi.fn();
  const next = vi.fn();
  const menus: MenuGroup[] = [
    { label: "File", commands: [{ label: "Rename", onSelect: rename }] },
    {
      label: "Slide",
      commands: [
        { label: "Next slide", onSelect: next },
        { label: "Previous slide", onSelect: vi.fn(), disabled: true },
      ],
    },
  ];
  render(
    <>
      <Menubar label="Editor menu" menus={menus} />
      <p>Outside</p>
    </>,
  );
  return { rename, next };
}

const trigger = (name: string) => screen.getByRole("menuitem", { name });

test("starts with every menu closed", () => {
  setup();

  expect(screen.getByRole("menubar", { name: "Editor menu" })).toBeInTheDocument();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger("File")).toHaveAttribute("aria-expanded", "false");
});

test("opens a menu on click, runs the chosen command and closes", () => {
  const { rename } = setup();

  fireEvent.click(trigger("File"));
  expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

  expect(rename).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("a second click on the trigger closes its menu", () => {
  setup();

  fireEvent.click(trigger("File"));
  fireEvent.click(trigger("File"));

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("moving along the bar switches menus only while one is open", () => {
  setup();

  fireEvent.mouseEnter(trigger("Slide"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();

  fireEvent.click(trigger("File"));
  fireEvent.mouseEnter(trigger("Slide"));

  expect(screen.getByRole("menu", { name: "Slide" })).toBeInTheDocument();
  expect(screen.queryByRole("menu", { name: "File" })).not.toBeInTheDocument();
});

test("Escape closes the menu and returns focus to its trigger", () => {
  setup();

  fireEvent.click(trigger("Slide"));
  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger("Slide")).toHaveFocus();
});

test("a click outside closes the menu", () => {
  setup();

  fireEvent.click(trigger("File"));
  fireEvent.mouseDown(screen.getByText("Outside"));

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("a disabled command cannot be chosen", () => {
  setup();

  fireEvent.click(trigger("Slide"));

  expect(screen.getByRole("menuitem", { name: "Previous slide" })).toBeDisabled();
});
