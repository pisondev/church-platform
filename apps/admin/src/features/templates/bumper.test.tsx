import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderWithMessages } from "@/test-utils";

import {
  Bumper,
  DATE_KEYFRAMES,
  LIFT_KEYFRAMES,
  LOOP_MS,
  NOTICE_KEYFRAMES,
  SCENE_KEYFRAMES,
  SPIN_KEYFRAMES,
  TITLE_KEYFRAMES,
  lockupKeyframes,
} from "./bumper";

// jsdom has no Web Animations API, so the tests supply the one method the bumper uses.
const cancel = vi.fn();
const animate = vi.fn((keyframes: Keyframe[]) => ({ cancel, keyframes }) as unknown as Animation);

beforeEach(() => {
  cancel.mockClear();
  animate.mockClear();
  HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
});

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

const NOTICE = "Handphone mohon dimatikan atau silent";

function renderBumper(live: boolean, notice: string | undefined = NOTICE) {
  const view = renderWithMessages(
    <Bumper
      logo="/logos/church.webp"
      church="GKJ Sentolo"
      title="Ibadah Minggu ke-2"
      date="Minggu, 11 Oktober 2026"
      notice={notice}
      live={live}
    />,
  );
  // By its alt text: a live bumper is hidden until its logo has loaded, and a hidden
  // image has no accessible name to find it by.
  const logo = screen.getByAltText("GKJ Sentolo logo");
  // The element that fades the whole bumper holds everything else.
  const scene = view.container.firstElementChild as HTMLElement;
  return { ...view, logo, scene };
}

// The keyframes each element was given, by the element.
const played = () => new Map(animate.mock.contexts.map((element, index) => [element, animate.mock.calls[index][0]]));

// Every number in a transform, in order: "translate(50%, 6cqw)" gives [50, 6].
const numbers = (frame: Keyframe) => (String(frame.transform).match(/-?\d+(\.\d+)?(?=[a-z%)])/g) ?? []).map(Number);
const offsetOf = (frame: Keyframe) => frame.offset ?? 0;

test("a still bumper shows the logo, the title, the date and the notice, and never moves", () => {
  const { logo } = renderBumper(false);
  fireEvent.load(logo);

  expect(logo).toHaveAttribute("src", "/logos/church.webp");
  expect(screen.getByText("Ibadah Minggu ke-2")).toBeVisible();
  expect(screen.getByText("Minggu, 11 Oktober 2026")).toBeVisible();
  expect(screen.getByText(NOTICE)).toBeVisible();
  expect(animate).not.toHaveBeenCalled();
});

test("the notice carries a phone icon and sits at the bottom, with the rest lifted above the middle", () => {
  const { logo } = renderBumper(false);
  const notice = screen.getByText(NOTICE).parentElement as HTMLElement;
  const lockup = logo.parentElement?.parentElement as HTMLElement;

  expect(notice.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(notice.style.backdropFilter).toContain("blur(");
  expect((notice.parentElement as HTMLElement).style.bottom).not.toBe("");
  expect(lockup.style.marginBottom).not.toBe("");
});

test("a live bumper stays empty until the logo has loaded, then plays every part without end", () => {
  const { logo, scene } = renderBumper(true);
  expect(animate).not.toHaveBeenCalled();
  expect(scene.style.visibility).toBe("hidden");

  fireEvent.load(logo);

  expect(scene.style.visibility).toBe("");
  expect(animate).toHaveBeenCalledTimes(7);
  for (const [, timing] of animate.mock.calls as unknown as [Keyframe[], KeyframeAnimationOptions][]) {
    expect(timing).toEqual({ duration: LOOP_MS, iterations: Infinity });
  }

  const parts = played();
  expect(parts.get(scene)).toBe(SCENE_KEYFRAMES);
  expect(parts.get(logo)).toBe(SPIN_KEYFRAMES);
  expect(parts.get(logo.parentElement)).toBe(LIFT_KEYFRAMES);
  expect(parts.get(logo.parentElement?.parentElement)).toEqual(lockupKeyframes(true));
  expect(parts.get(screen.getByText("Ibadah Minggu ke-2"))).toBe(TITLE_KEYFRAMES);
  expect(parts.get(screen.getByText("Minggu, 11 Oktober 2026"))).toBe(DATE_KEYFRAMES);
  expect(parts.get(screen.getByText(NOTICE).parentElement)).toBe(NOTICE_KEYFRAMES);
});

test("without a notice nothing moves up and no room is kept for one", () => {
  const { logo } = renderBumper(true, "");
  fireEvent.load(logo);

  expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  expect((logo.parentElement?.parentElement as HTMLElement).style.marginBottom).toBe("");
  expect(animate).toHaveBeenCalledTimes(6);
  expect(played().get(logo.parentElement?.parentElement)).toEqual(lockupKeyframes(false));
  expect(lockupKeyframes(false).every((frame) => numbers(frame)[1] === 0)).toBe(true);
});

test("the motion stops when the slide goes away", () => {
  const { logo, unmount } = renderBumper(true);
  fireEvent.load(logo);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(7);
});

test("a logo that fails to load leaves the bumper showing as it rests", () => {
  const { logo, scene } = renderBumper(true);

  fireEvent.error(logo);

  expect(scene.style.visibility).toBe("");
  expect(animate).not.toHaveBeenCalled();
});

test("a browser without the Web Animations API shows the bumper at rest", () => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;

  const { scene } = renderBumper(true);

  expect(scene.style.visibility).toBe("");
  expect(screen.getByText("Ibadah Minggu ke-2")).toBeVisible();
});

test("the logo starts below the frame, passes the center a little and settles on it", () => {
  const [start, top, rest] = LIFT_KEYFRAMES;
  const [from, peak, landed] = [start, top, rest].map((frame) => numbers(frame)[0]);

  // A 16:9 frame is 56.25cqw high and the logo arrives 30cqw high: its center has
  // to start more than 43.125cqw below the middle to be out of sight.
  expect(from).toBeGreaterThan(43.125);
  expect(peak).toBeLessThan(0);
  expect(peak).toBeGreaterThanOrEqual(-4.5);
  expect(landed).toBe(0);
  expect(offsetOf(start)).toBe(0);
  expect(offsetOf(rest)).toBeGreaterThan(offsetOf(top));
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

test("the logo flips three times on the way up and faces front when it arrives", () => {
  const [start, arrived] = SPIN_KEYFRAMES;

  expect(String(start.transform)).toMatch(/^rotateY\(/);
  // One flip is half a turn. Starting on its back, the logo ends facing front.
  expect(Math.abs(numbers(start)[0]) / 180).toBe(3);
  expect(numbers(arrived)[0]).toBe(0);
  expect(offsetOf(arrived)).toBe(offsetOf(LIFT_KEYFRAMES[1]));
});

test("after landing the logo glides left and shrinks a little while the title comes out", () => {
  const lockup = lockupKeyframes(true);
  const [, landed, beside] = lockup;
  const [, hidden, shown] = TITLE_KEYFRAMES;
  const [, , large, small] = SPIN_KEYFRAMES;

  // The glide starts once the logo has settled.
  expect(offsetOf(landed)).toBeGreaterThan(offsetOf(LIFT_KEYFRAMES[2]));
  // Half the width of the text to the right puts the logo in the middle of the frame.
  expect(numbers(lockup[0])[0]).toBe(50);
  expect(numbers(landed)[0]).toBe(50);
  expect(numbers(beside)[0]).toBe(0);
  expect(landed.easing).toBe(hidden.easing);

  // The title moves over the same time, from fully behind the edge of the logo.
  expect([offsetOf(hidden), offsetOf(shown)]).toEqual([offsetOf(landed), offsetOf(beside)]);
  expect(numbers(hidden)[0]).toBe(-100);
  expect(numbers(shown)[0]).toBe(0);

  // So does the change of size: a little, and never while the logo is turning.
  expect([offsetOf(large), offsetOf(small)]).toEqual([offsetOf(landed), offsetOf(beside)]);
  expect(numbers(large)).toEqual([0, numbers(SPIN_KEYFRAMES[0])[1]]);
  expect(numbers(large)[1]).toBeGreaterThan(1);
  expect(numbers(large)[1]).toBeLessThanOrEqual(1.3);
  expect(numbers(small)).toEqual([0, 1]);
});

test("the date line appears after the title is complete, moving right", () => {
  const [, away, arrived] = DATE_KEYFRAMES;

  expect(offsetOf(away)).toBeGreaterThanOrEqual(offsetOf(TITLE_KEYFRAMES[2]));
  expect(away.opacity).toBe(0);
  expect(numbers(away)[0]).toBeLessThan(0);
  expect(arrived.opacity).toBe(1);
  expect(numbers(arrived)[0]).toBe(0);
});

test("once the text is complete everything moves up and the notice fades in below", () => {
  const [, , , low, raised] = lockupKeyframes(true);
  const [, unseen, seen] = NOTICE_KEYFRAMES;

  expect(offsetOf(low)).toBeGreaterThanOrEqual(offsetOf(DATE_KEYFRAMES[2]));
  expect(numbers(low)[1]).toBeGreaterThan(0);
  expect(numbers(raised)).toEqual([0, 0]);

  // The notice does not move: it only fades in, not before the room for it opens.
  expect(NOTICE_KEYFRAMES.every((frame) => frame.transform === undefined)).toBe(true);
  expect(offsetOf(unseen)).toBeGreaterThan(offsetOf(low));
  expect(unseen.opacity).toBe(0);
  expect(seen.opacity).toBe(1);
});

test("each round ends on an empty frame, so the next one starts clean", () => {
  const last = SCENE_KEYFRAMES.at(-1)!;
  const fadeStart = SCENE_KEYFRAMES.findLast((frame) => frame.opacity === 1)!;

  expect(SCENE_KEYFRAMES[0].opacity).toBe(1);
  expect(offsetOf(last)).toBe(1);
  expect(last.opacity).toBe(0);
  // The finished bumper is on screen for most of the round.
  expect(offsetOf(fadeStart) - offsetOf(NOTICE_KEYFRAMES[2])).toBeGreaterThan(0.4);
});
