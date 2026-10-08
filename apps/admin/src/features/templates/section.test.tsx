import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { WAVES } from "./backdrop";
import {
  DIRECTION_KEYFRAMES,
  ENTER_MS,
  RULE_KEYFRAMES,
  STAGGER_MS,
  Section,
  TITLE_KEYFRAMES,
} from "./section";

// jsdom has no Web Animations API, so the tests supply the one method the slide uses.
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

type Call = [Keyframe[], KeyframeAnimationOptions];
// What the slide itself started, leaving out the waves of its backdrop.
const entrances = () => (animate.mock.calls as unknown as Call[]).filter(([, timing]) => timing.iterations !== Infinity);

test("a section shows its title, a rule and its direction, on the backdrop", () => {
  const { container } = render(<Section title="Persiapan Ibadah" subtitle="Jemaat mempersiapkan diri." live={false} />);
  const title = screen.getByText("Persiapan Ibadah");
  const direction = screen.getByText("Jemaat mempersiapkan diri.");

  expect(container.querySelector("[data-layer=water]")).toBeInTheDocument();
  // The rule stands between the two and says nothing to a screen reader.
  expect(title.nextElementSibling).toHaveAttribute("aria-hidden", "true");
  expect(title.nextElementSibling?.nextElementSibling).toBe(direction);
  expect(animate).not.toHaveBeenCalled();
});

test("a section without a direction shows its title and the rule only", () => {
  render(<Section title="Votum" live={false} />);
  const title = screen.getByText("Votum");

  expect(title.nextElementSibling).toHaveAttribute("aria-hidden", "true");
  expect(title.parentElement?.children).toHaveLength(2);
});

test("a live section brings in the title, the rule and the direction one after the other", () => {
  render(<Section title="Persiapan Ibadah" subtitle="Jemaat mempersiapkan diri." live />);

  expect(entrances().map(([keyframes]) => keyframes)).toEqual([TITLE_KEYFRAMES, RULE_KEYFRAMES, DIRECTION_KEYFRAMES]);
  expect(entrances().map(([, timing]) => timing.delay)).toEqual([0, STAGGER_MS, 2 * STAGGER_MS]);
  for (const [, timing] of entrances()) {
    expect(timing.duration).toBe(ENTER_MS);
    // Out of sight until its turn comes.
    expect(timing.fill).toBe("backwards");
  }
  // The backdrop moves too.
  expect(animate).toHaveBeenCalledTimes(3 + WAVES.length);
});

test("a live section without a direction brings in two parts", () => {
  render(<Section title="Votum" live />);

  expect(entrances().map(([keyframes]) => keyframes)).toEqual([TITLE_KEYFRAMES, RULE_KEYFRAMES]);
});

test("every part ends where it rests, fully shown", () => {
  for (const keyframes of [TITLE_KEYFRAMES, RULE_KEYFRAMES, DIRECTION_KEYFRAMES]) {
    expect(keyframes[0].opacity).toBe(0);
    expect(keyframes.at(-1)?.opacity).toBe(1);
    expect(String(keyframes.at(-1)?.transform)).toMatch(/^(translateY\(0cqw\)|scaleX\(1\))$/);
  }
  // Brief: the whole entrance is over within a second.
  expect(ENTER_MS + 2 * STAGGER_MS).toBeLessThan(1000);
});

test("the motion stops when the slide goes away", () => {
  const { unmount } = render(<Section title="Votum" live />);

  unmount();

  expect(cancel).toHaveBeenCalledTimes(2 + WAVES.length);
});
