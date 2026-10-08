import { expect, test } from "vitest";

import { coverTitle, serviceDateLine, sundayOfMonth, upcomingSunday } from "./service-date";

const day = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()];

test.each([
  ["a Friday", new Date(2026, 9, 9, 15, 30), [2026, 10, 11, 0]],
  ["a Sunday, even late in the evening", new Date(2026, 9, 11, 23, 59), [2026, 10, 11, 0]],
  ["a Monday", new Date(2026, 9, 12), [2026, 10, 18, 0]],
  ["the end of a month", new Date(2026, 9, 29), [2026, 11, 1, 0]],
  ["the end of a year", new Date(2026, 11, 30), [2027, 1, 3, 0]],
])("the coming Sunday from %s", (_, from, expected) => {
  expect(day(upcomingSunday(from))).toEqual(expected);
});

test.each([
  [new Date(2026, 9, 4), "Minggu, 4 Oktober 2026", 1],
  [new Date(2026, 9, 11), "Minggu, 11 Oktober 2026", 2],
  [new Date(2026, 8, 27), "Minggu, 27 September 2026", 4],
  [new Date(2026, 10, 29), "Minggu, 29 November 2026", 5],
])("the date line and the Sunday number of %s", (date, line, number) => {
  expect(serviceDateLine(date)).toBe(line);
  expect(sundayOfMonth(date)).toBe(number);
});

test("{n} in a cover title becomes the Sunday number", () => {
  expect(coverTitle("Ibadah Minggu ke-{n}", new Date(2026, 9, 11))).toBe("Ibadah Minggu ke-2");
  expect(coverTitle("Ibadah Natal", new Date(2026, 11, 25))).toBe("Ibadah Natal");
});
