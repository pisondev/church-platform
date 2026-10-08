import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Backdrop, DRIFT_KEYFRAMES, KAWUNG_TILE, MOTES, WATER_DEPTH, WAVES, moteKeyframes } from "./backdrop";

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
    motes: layer("mote"),
    waterRef: water,
  };
}

type Call = [Keyframe[], KeyframeAnimationOptions];
const calls = () => animate.mock.calls as unknown as Call[];

test("the backdrop is decoration behind the whole frame: sky, batik, water and motes of light", () => {
  const { backdrop, batik, water, waves, motes } = renderBackdrop(false);

  expect(backdrop).toHaveAttribute("aria-hidden", "true");
  expect(backdrop).toHaveClass("absolute", "inset-0");
  expect([...backdrop.children]).toEqual([batik, water, ...motes]);
  expect(waves).toHaveLength(WAVES.length);
  expect(motes).toHaveLength(MOTES.length);
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

test("a live backdrop moves every wave and every mote without end, each at its own pace", () => {
  const { waves, motes } = renderBackdrop(true);

  expect(animate.mock.contexts).toEqual([...waves, ...motes]);
  for (const [, timing] of calls()) {
    expect(timing.iterations).toBe(Infinity);
    // No easing: a wave that slowed down and sped up would show where it repeats.
    expect(timing.easing).toBeUndefined();
  }

  const waveCalls = calls().slice(0, waves.length);
  for (const [keyframes] of waveCalls) expect(keyframes).toBe(DRIFT_KEYFRAMES);
  expect(new Set(waveCalls.map(([, timing]) => timing.duration)).size).toBe(WAVES.length);
  expect(new Set(waveCalls.map(([, timing]) => timing.iterationStart)).size).toBe(WAVES.length);
  expect(waveCalls.some(([, timing]) => timing.direction === "reverse")).toBe(true);

  calls()
    .slice(waves.length)
    .forEach(([keyframes, timing], index) => {
      expect(keyframes).toEqual(moteKeyframes(MOTES[index]));
      expect(timing.duration).toBe(MOTES[index].seconds * 1000);
      expect(timing.iterationStart).toBe(MOTES[index].start);
    });
});

test("everything stops when the slide goes away", () => {
  const { unmount } = renderBackdrop(true);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(WAVES.length + MOTES.length);
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

test("a mote comes out of nothing, drifts up and goes out again", () => {
  for (const mote of MOTES) {
    const frames = moteKeyframes(mote);
    const [first, last] = [frames[0], frames.at(-1)!];
    const [, rise] = String(last.transform).match(/-?[\d.]+(?=cqw)/g)!.map(Number);

    expect(first.opacity).toBe(0);
    expect(last.opacity).toBe(0);
    expect(Math.max(...frames.map((frame) => Number(frame.opacity)))).toBeGreaterThan(0.5);
    expect(rise).toBeLessThan(0);
  }
});

test("the backdrop stays light, and slow", () => {
  for (const wave of WAVES) {
    const [red, green, blue] = wave.color.match(/\d+/g)!.map(Number);
    expect(Math.min(red, green, blue)).toBeGreaterThanOrEqual(140);
    expect(wave.seconds).toBeGreaterThanOrEqual(20);
  }
  for (const mote of MOTES) {
    expect(mote.seconds).toBeGreaterThanOrEqual(12);
    expect(mote.size).toBeLessThanOrEqual(4);
  }
});
