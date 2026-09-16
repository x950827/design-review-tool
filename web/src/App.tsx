import { AdminApp } from "./AdminApp";
import { ReviewApp } from "./ReviewApp";

export function App() {
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return <AdminApp />;
  const match = path.match(/^\/p\/([^/]+)/);
  if (match) return <ReviewApp slug={match[1]!} />;
  return (
    <div className="gate">
      <h1>Design Review</h1>
      <p>Откройте /admin или клиентскую ссылку /p/&lt;slug&gt;.</p>
    </div>
  );
}
