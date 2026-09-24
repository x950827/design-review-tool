import { ReactNode } from "react";
import { LangSwitch } from "./i18n";

export function AppChrome({
  href,
  subtitle,
  children,
}: {
  href: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="topnav motion-in motion-d0">
        <a className="brand" href={href}>
          <img
            className="brand-logo"
            src="/design-review-logo-outlined.svg"
            alt="Design Review"
            width={214}
            height={64}
          />
          {subtitle ? <span className="brand-sub">{subtitle}</span> : null}
        </a>
        {href === "/admin" ? <LangSwitch /> : null}
      </header>
      {children}
    </>
  );
}
