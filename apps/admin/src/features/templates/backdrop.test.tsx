import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Backdrop, DRIFT_KEYFRAMES, KAWUNG_TILE, WATER_DEPTH, WAVES } from "./backdrop";

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

function renderBackdrop(live: boolean, lift?: number) {
  const water = createRef<HTMLDivElement>();
  const view = render(<Backdrop live={live} lift={lift} water={water} />);
  const backdrop = view.container.firstElementChild as HTMLElement;
  const layer = (name: string) => [...backdrop.querySelectorAll<HTMLElement>(`[data-layer=${name}]`)];
  return {
    ...view,
    backdrop,
    batik: layer("batik")[0],
    water: layer("water")[0],
    waves: [...layer("water")[0].children] as HTMLElement[],
    waterRef: water,
  };
}

type Call = [Keyframe[], KeyframeAnimationOptions];
const calls = () => animate.mock.calls as unknown as Call[];

test("the backdrop is decoration behind the whole frame: sky, batik and water", () => {
  const { backdrop, batik, water, waves } = renderBackdrop(false);

  expect(backdrop).toHaveAttribute("aria-hidden", "true");
  expect(backdrop).toHaveClass("absolute", "inset-0");
  expect([...backdrop.children]).toEqual([batik, water]);
  expect(waves).toHaveLength(WAVES.length);
  for (const wave of waves) expect(wave.querySelector("svg path")).toBeInTheDocument();
});

test("the batik is a kawung tile, repeated, and shown only toward the top corners", () => {
  const { batik } = renderBackdrop(false);

  // Four petals around a point. jsdom does not keep an inline picture as a background,
  // so the tile is read from where it is defined.
  expect(KAWUNG_TILE.match(/<ellipse /g)).toHaveLength(4);
  expect(KAWUNG_TILE.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"')).toBe(true);
  expect(batik.style.backgroundSize).not.toBe("");
  expect(batik.style.maskImage).toContain("at 0% 0%");
  expect(batik.style.maskImage).toContain("at 100% 0%");
});

test("a still backdrop does not move", () => {
  renderBackdrop(false);

  expect(animate).not.toHaveBeenCalled();
});

test("a live backdrop moves every wave without end, each at its own pace", () => {
  const { waves } = renderBackdrop(true);

  expect(animate.mock.contexts).toEqual(waves);
  for (const [keyframes, timing] of calls()) {
    expect(keyframes).toBe(DRIFT_KEYFRAMES);
    expect(timing.iterations).toBe(Infinity);
    // No easing: a wave that slowed down and sped up would show where it repeats.
    expect(timing.easing).toBeUndefined();
  }
  expect(new Set(calls().map(([, timing]) => timing.duration)).size).toBe(WAVES.length);
  expect(new Set(calls().map(([, timing]) => timing.iterationStart)).size).toBe(WAVES.length);
  expect(calls().some(([, timing]) => timing.direction === "reverse")).toBe(true);
});

test("the waves stop when the slide goes away", () => {
  const { unmount } = renderBackdrop(true);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(WAVES.length);
});

test("the waves stay light, and slow", () => {
  for (const wave of WAVES) {
    const [red, green, blue] = wave.color.match(/[0-9]+/g)!.map(Number);
    expect(Math.min(red, green, blue)).toBeGreaterThanOrEqual(140);
    expect(wave.seconds).toBeGreaterThanOrEqual(20);
  }
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

test("the water can be lifted: there is more of it under every wave", () => {
  const { waves, water, waterRef } = renderBackdrop(false);

  expect(waterRef.current).toBe(water);
  for (const wave of waves) {
    const deep = wave.lastElementChild as HTMLElement;
    expect(deep).toHaveClass("top-full");
    expect(Number.parseFloat(deep.style.height)).toBe(WATER_DEPTH);
  }
});

test("a still backdrop shows the water lifted; a live one leaves lifting it to the bumper", () => {
  expect(renderBackdrop(false, 10).water.style.transform).toBe("translateY(-10cqw)");
  expect(renderBackdrop(false).water.style.transform).toBe("");
  expect(renderBackdrop(true, 10).water.style.transform).toBe("");
  // The bumper may lift it as far as its band is high.
  expect(WATER_DEPTH).toBeGreaterThanOrEqual(10);
});

