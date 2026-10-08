import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderWithMessages } from "@/test-utils";

import { Bumper, LIFT_KEYFRAMES, LOOP_MS, SPIN_KEYFRAMES } from "./bumper";

// jsdom has no Web Animations API, so the tests supply the one method the bumper uses.
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }) as unknown as Animation);

beforeEach(() => {
  cancel.mockClear();
  animate.mockClear();
  HTMLElement.prototype.animate = animate;
});

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

function renderBumper(live: boolean) {
  const view = renderWithMessages(<Bumper logo="/logos/church.webp" church="GKJ Sentolo" live={live} />);
  return { ...view, logo: screen.getByRole("img", { name: "GKJ Sentolo logo" }) };
}

// Reads a number out of a transform such as "translateY(-5%)".
const amount = (frame: Keyframe) => Number.parseFloat(String(frame.transform).replace(/^[a-zA-Z]+\(/, ""));

test("a still bumper shows the logo and never moves", () => {
  const { logo } = renderBumper(false);
  fireEvent.load(logo);

  expect(logo).toHaveAttribute("src", "/logos/church.webp");
  expect(animate).not.toHaveBeenCalled();
});

test("a live bumper starts once the logo has loaded and repeats without end", () => {
  const { logo } = renderBumper(true);
  expect(animate).not.toHaveBeenCalled();

  fireEvent.load(logo);

  const timing = { duration: LOOP_MS, iterations: Infinity };
  expect(animate).toHaveBeenCalledTimes(2);
  expect(animate).toHaveBeenCalledWith(LIFT_KEYFRAMES, timing);
  expect(animate).toHaveBeenCalledWith(SPIN_KEYFRAMES, timing);
  // The logo turns; the element around it carries it up.
  expect(animate.mock.contexts).toEqual([logo.parentElement, logo]);
});

test("the motion stops when the slide goes away", () => {
  const { logo, unmount } = renderBumper(true);
  fireEvent.load(logo);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(2);
});

test("a browser without the Web Animations API shows the logo at rest", () => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;

  const { logo } = renderBumper(true);
  fireEvent.load(logo);

  expect(logo).toBeInTheDocument();
});

test("the logo starts below the frame, passes the center a little and settles on it", () => {
  const [start, top, rest] = LIFT_KEYFRAMES;

  // The logo is about half the frame high, so 80% below the center is out of sight.
  expect(amount(start)).toBeGreaterThanOrEqual(80);
  expect(amount(top)).toBeLessThan(0);
  expect(amount(top)).toBeGreaterThanOrEqual(-8);
  expect(amount(rest)).toBe(0);
  expect(start.offset).toBe(0);
  expect(rest.offset).toBeGreaterThan(top.offset ?? 1);
});

test("the logo leaves fast and lands slowly", () => {
  const [start, top] = LIFT_KEYFRAMES;
  const [x1, y1, x2, y2] = String(start.easing).match(/[\d.]+/g)!.map(Number);

  // Steep at the start, flat at the end of the rise.
  expect(y1 / x1).toBeGreaterThan(3);
  expect(y2).toBe(1);
  expect(x2).toBeLessThan(1);
  // The fall back onto the center starts and ends at rest.
  expect(top.easing).toMatch(/^cubic-bezier\([\d.]+, 0, [\d.]+, 1\)$/);
});

test("the logo turns whole rounds on the way up and faces front when it arrives", () => {
  const [start, arrived] = SPIN_KEYFRAMES;

  expect(String(start.transform)).toMatch(/^rotateY\(/);
  expect(amount(start)).not.toBe(0);
  expect(Math.abs(amount(start)) % 360).toBe(0);
  expect(amount(arrived)).toBe(0);
  expect(arrived.offset).toBe(LIFT_KEYFRAMES[1].offset);
});

test("each round ends on an empty frame, so the next one starts clean", () => {
  const last = LIFT_KEYFRAMES.at(-1)!;
  const visible = LIFT_KEYFRAMES.filter((frame) => frame.opacity === 1);

  expect(last.offset).toBe(1);
  expect(last.opacity).toBe(0);
  expect(LIFT_KEYFRAMES[0].opacity).toBe(1);
  expect(Math.max(...visible.map((frame) => frame.offset ?? 0))).toBeGreaterThan(0.5);
});
