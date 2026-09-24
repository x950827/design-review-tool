import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import { AppChrome } from "./AppChrome";
import { CreateProjectForm } from "./admin/CreateProjectForm";
import { ProjectCard } from "./admin/ProjectCard";
import { LoginScreen } from "./LoginScreen";
import type { Project } from "./types";
import { useI18n } from "./i18n";
import { translateError } from "./messages";
import { PasswordField } from "./ui";

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const { t } = useI18n();

  async function refresh() {
    const data = await api("/admin/api/projects");
    setProjects(data.projects);
  }

  useEffect(() => {
    api("/admin/api/session")
      .then(() => {
        setAuthed(true);
        return refresh();
      })
      .catch(() => setAuthed(false));
  }, []);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/admin/api/login", { method: "POST", body: JSON.stringify({ password }) });
      setAuthed(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
  }

  if (!authed) {
    return (
      <LoginScreen href="/admin" error={error} onSubmit={onLogin}>
        <PasswordField
          id="admin-password"
          label={t("password")}
          value={password}
          onChange={setPassword}
        />
      </LoginScreen>
    );
  }

  return (
    <AppChrome href="/admin" subtitle={t("adminSubtitle")}>
      <main className="page">
        <h1 className="page-title motion-in motion-d1">{t("projectsTitle")}</h1>
        <div className="admin-grid">
          <CreateProjectForm onCreated={refresh} />
          <section>
            {projects.length === 0 ? <p className="project-meta">{t("emptyProjects")}</p> : null}
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onChange={refresh} />
            ))}
          </section>
        </div>
      </main>
    </AppChrome>
  );
}
