// "Church Platform" is a working name. Change the product name here only.
const name = "Church Platform";

export const siteConfig = {
  name,
  title: name,
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3101",
} as const;
