// Product identity. Change the name here only.
const name = "EccleService";

export const siteConfig = {
  name,
  title: `${name} Admin`,
  webUrl: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3100",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;
