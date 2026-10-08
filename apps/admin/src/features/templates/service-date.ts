// The date of a cover. A template has no date of its own: until presentations carry one,
// a cover shows the coming Sunday. The text is worship content, so it is Indonesian
// whatever the interface language.

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Today when it is a Sunday, otherwise the next one, in local time.
export function upcomingSunday(from: Date): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return date;
}

// "Minggu, 11 Oktober 2026".
export function serviceDateLine(date: Date): string {
  return DATE_FORMAT.format(date);
}

// Which Sunday of its month a date is, 1 to 5.
export function sundayOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

// In a cover title "{n}" stands for that number: "Ibadah Minggu ke-{n}" reads
// "Ibadah Minggu ke-2" on the second Sunday.
export function coverTitle(title: string, date: Date): string {
  return title.replaceAll("{n}", String(sundayOfMonth(date)));
}
