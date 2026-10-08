"use client";

import { useParams } from "next/navigation";

import { TemplateEditor } from "@/features/editor/template-editor";
import type { Church, Template } from "@/features/templates/types";
import { Resource, useApi } from "@/lib/api";

type Data = { church: Church; template: Template };

export default function TemplatePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const state = useApi<Data>(`/churches/${slug}/templates/${id}`);

  return <Resource state={state}>{(data) => <TemplateEditor {...data} />}</Resource>;
}
