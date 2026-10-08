"use client";

import { ArrowLeft, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import type { Church, TemplateSummary } from "@/features/templates/types";
import { Resource, useApi } from "@/lib/api";

type Data = { church: Church; templates: TemplateSummary[] };

export default function ChurchPage() {
  const t = useTranslations("Church");
  const { slug } = useParams<{ slug: string }>();
  const state = useApi<Data>(`/churches/${slug}/templates`);

  return (
    <Resource state={state}>
      {({ church, templates }) => (
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <ArrowLeft aria-hidden className="size-4" />
            {t("back")}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{church.name}</h1>

          <h2 className="mt-10 text-lg font-medium">{t("templatesTitle")}</h2>
          <p className="mt-1 text-muted">{t("templatesLead")}</p>

          {templates.length === 0 ? (
            <p className="mt-6 text-muted">{t("noTemplates")}</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <Link
                    href={`/churches/${church.slug}/templates/${template.id}`}
                    className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 hover:border-accent"
                  >
                    <LayoutTemplate aria-hidden className="mt-1 size-5 shrink-0 text-accent" />
                    <span>
                      <span className="block font-medium">{template.name}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {t("templateMeta", { count: template.slideCount, ratio: template.aspectRatio })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </Resource>
  );
}
