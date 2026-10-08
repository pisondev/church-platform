import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalDocument } from "@/components/legal-document";
import { privacyPolicy } from "@/content/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav");
  return { title: t("privacy") };
}

export default function PrivacyPage() {
  return <LegalDocument content={privacyPolicy} />;
}
