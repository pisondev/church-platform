import type { LegalContent } from "@/components/legal-document";
import { siteConfig } from "@/config/site";

const { name, operator, contactEmail } = siteConfig;

export const privacyPolicy: LegalContent = {
  title: "Privacy Policy",
  effectiveDate: "8 October 2026",
  intro: `This policy explains what ${name} collects, why, and what you can do about it.`,
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        `${name} is operated by ${operator}. For any privacy question, write to ${contactEmail}.`,
      ],
    },
    {
      heading: "What we collect",
      items: [
        "Account details from Google when you sign in: your name, email address, profile picture and Google account ID.",
        "Content you create in the service, such as templates and presentations.",
        "Technical records needed to run and protect the service: IP address, browser type and the time of each request.",
      ],
    },
    {
      heading: "How we use it",
      items: [
        "To sign you in and decide what you are allowed to manage.",
        "To show your name and picture inside the service.",
        "To store and display the content you create.",
        "To keep the service secure and to investigate faults.",
      ],
      paragraphs: ["We do not sell your data and we do not use it for advertising."],
    },
    {
      heading: "Google user data",
      paragraphs: [
        `${name} requests only the openid, email and profile scopes. It cannot read your Gmail, Drive, Calendar or any other Google product.`,
        `The use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Google user data is used only to provide sign-in and to identify your account in ${name}.`,
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "Data is stored with the infrastructure providers that host the service and its files. They process it on our behalf and only to provide that hosting.",
        "We disclose data when the law requires it. We do not share it with anyone else.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "The service sets one essential cookie that keeps you signed in. It sets no advertising or tracking cookies.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        `Account details and content are kept while your account is active. To have your account and its data deleted, write to ${contactEmail}. Deletion is completed within 30 days, except for records the law requires us to keep.`,
      ],
    },
    {
      heading: "Your choices",
      items: [
        "Ask for a copy of the data held about you.",
        "Ask for a correction or for deletion.",
        "Remove the service's access at any time from your Google account settings.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        "When this policy changes, the new version is published on this page with a new effective date.",
      ],
    },
  ],
};
