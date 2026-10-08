// Product identity. Change the name, tagline or contact details here only.
const name = "EccleService";

export const siteConfig = {
  name,
  title: name,
  tagline: "a service for your Ecclesia (a.k.a Church)",
  operator: "Pison Golda",
  contactEmail: "pison.gm.dev@gmail.com",
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3101",
} as const;
