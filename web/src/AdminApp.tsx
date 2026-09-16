import { FormEvent, useEffect, useState } from "react";

type Variant = { key: string; label: string; git_path: string };
type Reviewer = { id: number; name: string; disabled: number };
type Project = {
  id: number;
  slug: string;
  title: string;
  git_url: string;
  branch: string;
  variants: Variant[];
  reviewers: Reviewer[];
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

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
      <form className="gate" onSubmit={onLogin}>
        <h1>Админка</h1>
        <label>Пароль</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Войти</button>
      </form>
    );
  }

  return (
    <div className="admin">
      <h1>Проекты</h1>
      <CreateProject onCreated={refresh} />
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onChange={refresh} />
      ))}
    </div>
  );
}

function CreateProject({ onCreated }: { onCreated: () => Promise<void> }) {
  const [title, setTitle] = useState("Цветочный каталог");
  const [slug, setSlug] = useState("flower-shop");
  const [gitUrl, setGitUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathA, setPathA] = useState("docs/design/home-catalog/variant-a");
  const [pathB, setPathB] = useState("docs/design/home-catalog/variant-b");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/admin/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug,
          gitUrl,
          branch,
          variants: [
            { key: "a", label: "Вариант A", git_path: pathA },
            { key: "b", label: "Вариант B", git_path: pathB },
          ],
        }),
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Новый проект</h2>
      <label>Название</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Slug</label>
      <input value={slug} onChange={(e) => setSlug(e.target.value)} />
      <label>Git URL (SSH / HTTPS / локальный путь)</label>
      <input value={gitUrl} onChange={(e) => setGitUrl(e.target.value)} />
      <label>Ветка</label>
      <input value={branch} onChange={(e) => setBranch(e.target.value)} />
      <label>Путь варианта A</label>
      <input value={pathA} onChange={(e) => setPathA(e.target.value)} />
      <label>Путь варианта B</label>
      <input value={pathB} onChange={(e) => setPathB(e.target.value)} />
      {error ? <p className="error">{error}</p> : null}
      <button type="submit">Создать</button>
    </form>
  );
}

function ProjectCard({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function addReviewer(event: FormEvent) {
    event.preventDefault();
    await api(`/admin/api/projects/${project.id}/reviewers`, {
      method: "POST",
      body: JSON.stringify({ name, password }),
    });
    setName("");
    setPassword("");
    await onChange();
  }

  async function sync() {
    setMessage("Sync…");
    const data = await api(`/admin/api/projects/${project.id}/sync`, { method: "POST" });
    setMessage(`коммитов: ${data.history?.length ?? 0}`);
  }

  return (
    <section className="card">
      <h2>
        {project.title}{" "}
        <a href={`/p/${project.slug}`} target="_blank" rel="noreferrer">
          /p/{project.slug}
        </a>
      </h2>
      <p>
        {project.git_url} · {project.branch}
      </p>
      <p>Варианты: {project.variants.map((v) => `${v.label} (${v.git_path})`).join(", ")}</p>
      <p>
        Учётки:{" "}
        {project.reviewers.length
          ? project.reviewers.map((r) => `${r.name}${r.disabled ? " (выкл)" : ""}`).join(", ")
          : "нет"}
      </p>
      <form onSubmit={addReviewer}>
        <label>Имя ревьюера</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Пароль</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Добавить учётку</button>
      </form>
      <button type="button" onClick={sync}>
        Sync git
      </button>
      <a href={`/admin/api/projects/${project.id}/export.json`}>Экспорт JSON</a>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
