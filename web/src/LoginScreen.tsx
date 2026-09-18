import { FormEvent, ReactNode } from "react";
import { AppChrome } from "./AppChrome";
import { FormError } from "./ui";

export function LoginScreen({
  href,
  heading,
  error,
  onSubmit,
  children,
}: {
  href: string;
  heading?: string;
  error: string;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <AppChrome href={href}>
      <main className="page-narrow">
        <img
          className="login-mark motion-in-scale motion-d1"
          src="/design-review-mark-512.png"
          alt="Design Review"
          width={256}
          height={256}
        />
        {heading ? (
          <h1 className="page-title is-centered motion-in motion-d2">{heading}</h1>
        ) : null}
        <form className="card motion-in-scale motion-d3" onSubmit={onSubmit}>
          {children}
          <FormError message={error} />
          <button type="submit" className="btn btn-primary btn-block">
            Войти
          </button>
        </form>
      </main>
    </AppChrome>
  );
}
