"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Guide", href: "/docs" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

/** The landing page's pill bar, with page links instead of section links; the open page wears the pill. */
export default function InfoNav() {
  const pathname = usePathname();
  return (
    <header className="lp-header">
      <Link href="/" className="lp-header__brand">
        <span className="lp-header__mark" aria-hidden="true">
          B
        </span>
        <span className="lp-header__name">Breakout Workspace</span>
      </Link>
      <nav className="lp-nav" aria-label="Help and policies">
        {PAGES.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="lp-nav__link info-nav__link"
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
