import { FormEvent, useEffect, useState } from "react";
import { api } from "./api";
import { AppChrome } from "./AppChrome";
import { CreateProjectForm } from "./admin/CreateProjectForm";
import { ProjectCard } from "./admin/ProjectCard";
import { LoginScreen } from "./LoginScreen";
import type { Project } from "./types";
import { PasswordField } from "./ui";

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);

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
      setError(err instanceof Error ? err.message : "ошибка");
    }
  }

  if (!authed) {
    return (
      <LoginScreen href="/admin" error={error} onSubmit={onLogin}>
        <PasswordField
          id="admin-password"
          label="Пароль"
          value={password}
          onChange={setPassword}
        />
      </LoginScreen>
    );
  }

  return (
    <AppChrome href="/admin" subtitle="/ Админка">
      <main className="page">
        <h1 className="page-title motion-in motion-d1">Проекты</h1>
        <div className="admin-grid">
          <CreateProjectForm onCreated={refresh} />
          <section>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onChange={refresh} />
            ))}
          </section>
        </div>
      </main>
    </AppChrome>
  );
}
