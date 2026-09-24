import { AdminApp } from "./AdminApp";
import { AppChrome } from "./AppChrome";
import { useI18n } from "./i18n";
import { ReviewApp } from "./ReviewApp";

export function App() {
  const { t } = useI18n();
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return <AdminApp />;
  const match = path.match(/^\/p\/([^/]+)/);
  if (match) return <ReviewApp slug={match[1]!} />;
  return (
    <AppChrome href="/admin">
      <main className="page">
        <h1 className="page-title">Design Review</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>{t("homeHint")}</p>
      </main>
    </AppChrome>
  );
}
