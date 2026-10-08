// Pictures that ship with the app, by church slug. Churches cannot upload their own yet.
// The emblem is what the cover bumper brings in. The wordmark is the logo that spells the
// name of the church; it sits on the band at the bottom of the bumper.
export type ChurchLogos = { emblem: string; wordmark?: string };

const LOGOS = new Map<string, ChurchLogos>([
  ["gkj-sentolo", { emblem: "/logos/gkj-sentolo.webp", wordmark: "/logos/gkj-sentolo-wordmark.webp" }],
]);

export function churchLogos(slug: string): ChurchLogos | undefined {
  return LOGOS.get(slug);
}
