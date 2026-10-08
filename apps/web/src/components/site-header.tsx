import { Church, LogIn } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Church aria-hidden className="size-5 text-accent" />
          {siteConfig.name}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm">
          <Link href="/about" className="text-muted hover:text-foreground">
            {t("about")}
          </Link>
          <Link href="/contact" className="text-muted hover:text-foreground">
            {t("contact")}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <LogIn aria-hidden className="size-4" />
            {t("signIn")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
