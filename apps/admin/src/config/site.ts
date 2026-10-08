// "Church Platform" is a working name. Change the product name here only.
const name = "Church Platform";

export const siteConfig = {
  name,
  title: `${name} Admin`,
  webUrl: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3100",
} as const;
