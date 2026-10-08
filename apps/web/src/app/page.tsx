import { BookOpen, LayoutTemplate, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

const features = [
  { key: "templates", icon: LayoutTemplate },
  { key: "library", icon: BookOpen },
  { key: "present", icon: MonitorPlay },
] as const;

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
      <p className="text-sm font-medium text-accent">{siteConfig.tagline}</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">{t("lead")}</p>

      <ul className="mt-16 grid gap-6 sm:grid-cols-3">
        {features.map(({ key, icon: Icon }) => (
          <li key={key} className="rounded-lg border border-border bg-surface p-6">
            <Icon aria-hidden className="size-6 text-accent" />
            <h2 className="mt-4 font-medium">{t(`features.${key}.title`)}</h2>
            <p className="mt-2 text-sm text-muted">{t(`features.${key}.body`)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
