import type { LegalContent } from "@/components/legal-document";
import { siteConfig } from "@/config/site";

const { name, operator, contactEmail } = siteConfig;

export const termsOfService: LegalContent = {
  title: "Terms of Service",
  effectiveDate: "8 October 2026",
  intro: `These terms apply to your use of ${name}. By using the service you agree to them.`,
  sections: [
    {
      heading: "The service",
      paragraphs: [
        `${name} is a management platform for churches, operated by ${operator}. It is under active development, so features may change or be removed.`,
      ],
    },
    {
      heading: "Accounts",
      items: [
        "You sign in with a Google account. Access is granted by invitation.",
        "You are responsible for what happens under your account. Tell us promptly if you believe someone else has used it.",
        "We may suspend an account that breaks these terms or puts the service at risk.",
      ],
    },
    {
      heading: "Your content",
      paragraphs: [
        "You keep ownership of the content you add. You give us permission to store and process it only as needed to provide the service to you.",
        "You are responsible for having the right to use what you add, including hymn lyrics, music notation, scripture text and images.",
      ],
    },
    {
      heading: "Acceptable use",
      items: [
        "Do not use the service to break the law or to infringe the rights of others.",
        "Do not try to access data that is not yours.",
        "Do not disrupt the service or attempt to bypass its security.",
      ],
    },
    {
      heading: "Availability",
      paragraphs: [
        "We work to keep the service available but do not guarantee uninterrupted access. Keep a copy of anything you cannot afford to lose, for example by exporting your presentation before a service.",
      ],
    },
    {
      heading: "Disclaimer and liability",
      paragraphs: [
        'The service is provided "as is", without warranties of any kind. To the extent the law allows, we are not liable for indirect or consequential loss arising from its use.',
      ],
    },
    {
      heading: "Ending use",
      paragraphs: [
        `You may stop using the service at any time and ask for your data to be deleted by writing to ${contactEmail}.`,
      ],
    },
    {
      heading: "Governing law",
      paragraphs: ["These terms are governed by the laws of the Republic of Indonesia."],
    },
    {
      heading: "Changes and contact",
      paragraphs: [
        `When these terms change, the new version is published on this page with a new effective date. Questions go to ${contactEmail}.`,
      ],
    },
  ],
};
