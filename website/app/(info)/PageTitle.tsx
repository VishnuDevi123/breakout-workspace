import type { ReactNode } from "react";

/** The landing page's section heading: a mono eyebrow, then a title with one accent word. */
export default function PageTitle({ eyebrow, children, meta }: { eyebrow: string; children: ReactNode; meta: string }) {
  return (
    <header className="info-head lp-rise">
      <p className="lp-eyebrow">{eyebrow}</p>
      <h1 className="lp-heading">{children}</h1>
      <p className="info-head__meta">{meta}</p>
    </header>
  );
}
