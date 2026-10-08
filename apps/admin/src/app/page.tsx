import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <p className="flex items-center gap-2 text-sm font-medium text-accent">
          <ShieldCheck aria-hidden className="size-5" />
          {siteConfig.name}
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("lead")}</p>

        <p role="status" className="mt-6 rounded-md border border-border px-4 py-3 text-sm text-muted">
          {t("signInUnavailable")}
        </p>

        <a
          href={siteConfig.webUrl}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t("backToSite")}
        </a>
      </section>
    </main>
  );
}
