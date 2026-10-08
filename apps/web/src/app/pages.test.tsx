import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { siteConfig } from "@/config/site";
import { privacyPolicy } from "@/content/privacy";
import { termsOfService } from "@/content/terms";
import { renderWithMessages } from "@/test-utils";

import AboutPage from "./about/page";
import ContactPage from "./contact/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

test("about page names the product and its operator", () => {
  renderWithMessages(<AboutPage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(siteConfig.name);
  expect(screen.getByText(new RegExp(`operated by ${siteConfig.operator}`))).toBeInTheDocument();
});

test("contact page offers the contact email", () => {
  renderWithMessages(<ContactPage />);

  expect(screen.getByRole("link", { name: siteConfig.contactEmail })).toHaveAttribute(
    "href",
    `mailto:${siteConfig.contactEmail}`,
  );
});

describe.each([
  ["privacy policy", PrivacyPage, privacyPolicy],
  ["terms of service", TermsPage, termsOfService],
])("%s", (_name, Page, content) => {
  test("renders its title, date and every numbered section", () => {
    renderWithMessages(<Page />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(content.title);
    expect(screen.getByText(`Effective ${content.effectiveDate}`)).toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(content.sections.map((section, index) => `${index + 1}. ${section.heading}`));
  });

  test("gives every section a body", () => {
    for (const section of content.sections) {
      const size = (section.paragraphs?.length ?? 0) + (section.items?.length ?? 0);
      expect(size, section.heading).toBeGreaterThan(0);
    }
  });
});

test("privacy policy covers what Google requires", () => {
  const text = JSON.stringify(privacyPolicy);

  expect(text).toContain("Google API Services User Data Policy");
  expect(text).toContain("Limited Use");
  expect(text).toContain(siteConfig.contactEmail);
});
