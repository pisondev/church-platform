import { BookOpen, Church, LayoutTemplate, LogIn, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

const features = [
  { key: "templates", icon: LayoutTemplate },
  { key: "library", icon: BookOpen },
  { key: "present", icon: MonitorPlay },
] as const;

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <span className="flex items-center gap-2 font-semibold">
            <Church aria-hidden className="size-5 text-accent" />
            {siteConfig.name}
          </span>
          <a
            href={siteConfig.adminUrl}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <LogIn aria-hidden className="size-4" />
            {t("Header.signIn")}
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="text-sm font-medium text-accent">{t("Home.eyebrow")}</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("Home.title")}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">{t("Home.lead")}</p>

        <ul className="mt-16 grid gap-6 sm:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-lg border border-border bg-surface p-6">
              <Icon aria-hidden className="size-6 text-accent" />
              <h2 className="mt-4 font-medium">{t(`Home.features.${key}.title`)}</h2>
              <p className="mt-2 text-sm text-muted">{t(`Home.features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-muted">
          © {siteConfig.name}. {t("Footer.rights")}
        </p>
      </footer>
    </>
  );
}
