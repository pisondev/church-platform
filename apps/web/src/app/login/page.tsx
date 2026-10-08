import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";

import { LoginError } from "./login-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("title") };
}

export default function LoginPage() {
  const t = useTranslations("Login");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("lead")}</p>

        {/* The reason comes from the query string, which is only known per request. */}
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>

        <a
          href={`${siteConfig.apiUrl}/api/v1/auth/google/start`}
          className="mt-6 flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          <LogIn aria-hidden className="size-5" />
          {t("google")}
        </a>

        <p className="mt-6 text-sm text-muted">{t("legal")}</p>
      </section>
    </main>
  );
}
