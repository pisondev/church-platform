"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Slideshow } from "@/features/songs/slideshow";
import { FrameView } from "@/features/templates/frame-view";
import { buildFrames } from "@/features/templates/frames";
import type { Church, Template } from "@/features/templates/types";
import { Resource, useApi } from "@/lib/api";

type Data = { church: Church; template: Template };

function TemplateView({ church, template }: Data) {
  const t = useTranslations("Templates");
  const frames = useMemo(
    () => buildFrames(template.slides).map((frame) => <FrameView key={frame.key} frame={frame} />),
    [template.slides],
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link
        href={`/churches/${church.slug}`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {church.name}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{template.name}</h1>
      <p className="mt-2 mb-8 text-muted">
        {t("meta", { count: template.slideCount, ratio: template.aspectRatio })}
      </p>

      <Slideshow slides={frames} />
    </main>
  );
}

export default function TemplatePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const state = useApi<Data>(`/churches/${slug}/templates/${id}`);

  return <Resource state={state}>{(data) => <TemplateView {...data} />}</Resource>;
}
