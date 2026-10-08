import Link from "next/link";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

const links = [
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted">
        <p>
          © {siteConfig.name}. {t("Footer.rights")}
        </p>
        <nav aria-label="Legal" className="flex gap-6">
          {links.map(({ href, key }) => (
            <Link key={href} href={href} className="hover:text-foreground">
              {t(`Nav.${key}`)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
