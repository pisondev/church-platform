import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Backdrop, DRIFT_KEYFRAMES, WAVES } from "./backdrop";

// jsdom has no Web Animations API, so the tests supply the one method the backdrop uses.
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }) as unknown as Animation);

beforeEach(() => {
  cancel.mockClear();
  animate.mockClear();
  HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
});

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

function renderBackdrop(live: boolean) {
  const view = render(<Backdrop live={live} />);
  const backdrop = view.container.firstElementChild as HTMLElement;
  return { ...view, backdrop, waves: [...backdrop.children] as HTMLElement[] };
}

test("the backdrop is decoration: hidden from assistive technology, behind the whole frame", () => {
  const { backdrop, waves } = renderBackdrop(false);

  expect(backdrop).toHaveAttribute("aria-hidden", "true");
  expect(backdrop).toHaveClass("absolute", "inset-0");
  expect(waves).toHaveLength(WAVES.length);
  for (const wave of waves) expect(wave.querySelector("svg path")).toBeInTheDocument();
});

test("a still backdrop does not move", () => {
  renderBackdrop(false);

  expect(animate).not.toHaveBeenCalled();
});

test("a live backdrop moves every wave without end, at its own pace", () => {
  const { waves } = renderBackdrop(true);

  expect(animate.mock.contexts).toEqual(waves);
  const timings = (animate.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][]).map(([keyframes, timing]) => {
    expect(keyframes).toBe(DRIFT_KEYFRAMES);
    expect(timing.iterations).toBe(Infinity);
    // No easing: a wave that slowed down and sped up would show where it repeats.
    expect(timing.easing).toBeUndefined();
    return timing;
  });

  expect(new Set(timings.map((timing) => timing.duration)).size).toBe(WAVES.length);
  expect(new Set(timings.map((timing) => timing.iterationStart)).size).toBe(WAVES.length);
  expect(timings.some((timing) => timing.direction === "reverse")).toBe(true);
});

test("the waves stop when the slide goes away", () => {
  const { unmount } = renderBackdrop(true);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(WAVES.length);
});

test("a wave ends each pass on the picture it started with", () => {
  // Twice as wide as the frame, moved by half its width: one frame width.
  expect(DRIFT_KEYFRAMES.map((frame) => frame.transform)).toEqual(["translateX(0%)", "translateX(-50%)"]);
  for (const wave of renderBackdrop(false).waves) expect(wave).toHaveClass("w-[200%]");

  for (const { path } of WAVES) {
    // The curve at 0, 600 and 1200 of its 1200 units is at the same height, so both
    // halves of the picture are alike where they meet.
    const start = /^M0 (\d+)/.exec(path)?.[1];
    expect(path).toContain(` 600 ${start} `);
    expect(path).toContain(` 1200 ${start} V100 H0 Z`);
  }
});

test("the waves stay light, and slow", () => {
  for (const wave of WAVES) {
    const [red, green, blue] = wave.color.match(/\d+/g)!.map(Number);
    expect(Math.min(red, green, blue)).toBeGreaterThanOrEqual(140);
    expect(wave.seconds).toBeGreaterThanOrEqual(20);
  }
});
