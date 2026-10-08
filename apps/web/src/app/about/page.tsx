import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav");
  return { title: t("about") };
}

export default function AboutPage() {
  const t = useTranslations("About");
  const { name, operator } = siteConfig;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title", { name })}</h1>
      <p className="mt-6 text-lg text-muted">{t("lead", { name })}</p>

      <h2 className="mt-10 text-lg font-medium">{t("whyTitle")}</h2>
      <p className="mt-3 text-muted">{t("why", { name })}</p>

      <h2 className="mt-10 text-lg font-medium">{t("whoTitle")}</h2>
      <p className="mt-3 text-muted">{t("who", { name, operator })}</p>
    </main>
  );
}
