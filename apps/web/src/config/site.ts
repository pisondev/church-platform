// Product identity. Change the name, tagline or contact details here only.
const name = "EccleService";

export const siteConfig = {
  name,
  title: name,
  tagline: "a service for your Ecclesia (a.k.a Church)",
  operator: "Pison Golda",
  contactEmail: "pison.gm.dev@gmail.com",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;
