import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav");
  return { title: t("contact") };
}

export default function ContactPage() {
  const t = useTranslations("Contact");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-6 text-lg text-muted">{t("lead")}</p>

      <dl className="mt-10 rounded-lg border border-border bg-surface p-6">
        <dt className="flex items-center gap-2 text-sm font-medium">
          <Mail aria-hidden className="size-4 text-accent" />
          {t("emailLabel")}
        </dt>
        <dd className="mt-2">
          <a href={`mailto:${siteConfig.contactEmail}`} className="text-accent hover:underline">
            {siteConfig.contactEmail}
          </a>
        </dd>
      </dl>
    </main>
  );
}
