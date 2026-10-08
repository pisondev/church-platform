import { useTranslations } from "next-intl";

export type LegalSection = {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

export type LegalContent = {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: readonly LegalSection[];
};

// Legal text is written in English only, so it lives in src/content and not in messages/.
export function LegalDocument({ content }: { content: LegalContent }) {
  const t = useTranslations("Legal");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-2 text-sm text-muted">{t("effective", { date: content.effectiveDate })}</p>
      <p className="mt-6 text-muted">{content.intro}</p>

      {content.sections.map((section, index) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-lg font-medium">
            {index + 1}. {section.heading}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-muted">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
