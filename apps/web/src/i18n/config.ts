// Add a locale here and a matching file in messages/ to translate the app.
export const locales = ["en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
