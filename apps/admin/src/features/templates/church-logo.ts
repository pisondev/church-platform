// Logos that ship with the app, by church slug. Churches cannot upload their own yet.
const LOGOS = new Map([["gkj-sentolo", "/logos/gkj-sentolo.webp"]]);

export function churchLogo(slug: string): string | undefined {
  return LOGOS.get(slug);
}
