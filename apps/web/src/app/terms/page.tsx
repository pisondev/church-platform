import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalDocument } from "@/components/legal-document";
import { termsOfService } from "@/content/terms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav");
  return { title: t("terms") };
}

export default function TermsPage() {
  return <LegalDocument content={termsOfService} />;
}
