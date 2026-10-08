import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { emphasize } from "./emphasis";

const html = (text: string) => render(<p>{emphasize(text)}</p>).container.querySelector("p")?.innerHTML;

test("text between asterisks is set in italics", () => {
  expect(html("Handphone mohon dimatikan atau *silent*")).toBe(
    'Handphone mohon dimatikan atau <em class="italic">silent</em>',
  );
  expect(html("*Welcome* dan *goodbye*")).toBe('<em class="italic">Welcome</em> dan <em class="italic">goodbye</em>');
});

test("text without a pair of asterisks is left as it is", () => {
  expect(html("Handphone mohon dimatikan")).toBe("Handphone mohon dimatikan");
  expect(html("5 * 3 = 15")).toBe("5 * 3 = 15");
  expect(html("**")).toBe("**");
});
