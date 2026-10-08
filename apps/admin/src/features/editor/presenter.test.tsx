import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { FADE_IN_MS, FADE_OUT_MS, Presenter } from "./presenter";

const frames = ["One", "Two", "Three"].map((text) => <p key={text}>{text}</p>);
const press = (key: string) => fireEvent.keyDown(window, { key });

function renderPresenter(start = 0) {
  const onClose = vi.fn();
  render(<Presenter label="Slideshow" frames={frames} start={start} onClose={onClose} />);
  return { onClose };
}

// jsdom has no Web Animations API. These tests supply the method the slideshow uses and
// keep every animation it starts, so a test can say when one has finished.
type Fade = { keyframes: Keyframe[]; timing: KeyframeAnimationOptions; cancel: () => void; onfinish: (() => void) | null };
const fades: Fade[] = [];

function withAnimations() {
  fades.length = 0;
  HTMLElement.prototype.animate = function (keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
    const fade: Fade = { keyframes, timing, cancel: vi.fn(), onfinish: null };
    fades.push(fade);
    return fade as unknown as Animation;
  } as HTMLElement["animate"];
}

const finish = (fade: Fade) => act(() => fade.onfinish?.());
const opacities = (fade: Fade) => fade.keyframes.map((frame) => Number(frame.opacity));

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

test("without the Web Animations API frames change at once", () => {
  renderPresenter();

  press("ArrowRight");
  expect(screen.getByText("Two")).toBeInTheDocument();
  expect(screen.queryByText("One")).not.toBeInTheDocument();

  press("End");
  expect(screen.getByText("Three")).toBeInTheDocument();
});

test("the first frame fades in", () => {
  withAnimations();
  renderPresenter();

  expect(screen.getByText("One")).toBeInTheDocument();
  expect(fades).toHaveLength(1);
  expect(opacities(fades[0])).toEqual([0, 1]);
  expect(fades[0].timing.duration).toBe(FADE_IN_MS);
});

test("a step fades the frame on screen out, then fades the next one in", async () => {
  withAnimations();
  renderPresenter();

  press("ArrowRight");

  // Still the old frame, on its way out.
  expect(screen.getByText("One")).toBeInTheDocument();
  expect(screen.queryByText("Two")).not.toBeInTheDocument();
  const out = fades.at(-1)!;
  expect(opacities(out)).toEqual([1, 0]);
  expect(out.timing).toMatchObject({ duration: FADE_OUT_MS, fill: "forwards" });

  await finish(out);

  expect(screen.getByText("Two")).toBeInTheDocument();
  expect(screen.queryByText("One")).not.toBeInTheDocument();
  const into = fades.at(-1)!;
  expect(opacities(into)).toEqual([0, 1]);
  expect(into.timing.duration).toBe(FADE_IN_MS);
});

test("the change is brief: out faster than in, both well under half a second", () => {
  expect(FADE_OUT_MS).toBeLessThan(FADE_IN_MS);
  expect(FADE_OUT_MS + FADE_IN_MS).toBeLessThan(500);
});

test("quick steps land on the last frame asked for, without showing the ones between", async () => {
  withAnimations();
  renderPresenter();

  press("ArrowRight");
  const out = fades.at(-1)!;
  press("ArrowRight");

  // One fade out for both steps.
  expect(fades.at(-1)).toBe(out);
  await finish(out);

  expect(screen.getByText("Three")).toBeInTheDocument();
  expect(screen.queryByText("Two")).not.toBeInTheDocument();
});

test("stepping back onto the frame on screen calls the fade off", () => {
  withAnimations();
  renderPresenter();

  press("ArrowRight");
  const out = fades.at(-1)!;
  press("ArrowLeft");

  expect(out.cancel).toHaveBeenCalled();
  expect(screen.getByText("One")).toBeInTheDocument();
});

test("Escape closes the slideshow", () => {
  const { onClose } = renderPresenter();

  press("Escape");

  expect(onClose).toHaveBeenCalled();
});
