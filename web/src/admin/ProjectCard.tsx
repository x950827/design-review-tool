import { FormEvent, useState } from "react";
import { api } from "../api";
import type { Project } from "../types";

export function ProjectCard({
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
    <article className="card-flat project-card motion-in-scale">
      <h3>{project.title}</h3>
      <p className="project-meta">
        <a href={`/p/${project.slug}`} target="_blank" rel="noreferrer">
          /p/{project.slug}
        </a>
      </p>
      <p className="project-meta">
        <span className="num">{project.git_url}</span> ·{" "}
        <span className="num">{project.branch}</span>
      </p>
      <div className="project-tags">
        {project.variants.map((variant) => (
          <span className="tag" key={variant.key}>
            {variant.label} ({variant.git_path})
          </span>
        ))}
      </div>
      <p className="accounts-label">Учётки</p>
      <ul className="accounts">
        {project.reviewers.length ? (
          project.reviewers.map((reviewer) =>
            reviewer.disabled ? (
              <li className="off" key={reviewer.id}>
                {reviewer.name} <span className="tag tag-muted">(выкл)</span>
              </li>
            ) : (
              <li key={reviewer.id}>{reviewer.name}</li>
            ),
          )
        ) : (
          <li className="off">нет</li>
        )}
      </ul>
      <form className="inline-form" onSubmit={addReviewer}>
        <input
          className="input"
          placeholder="Имя ревьюера"
          aria-label="Имя ревьюера"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <input
          className="input"
          placeholder="Пароль"
          type="password"
          aria-label="Пароль"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Добавить учётку
        </button>
      </form>
      <div className="card-actions">
        <button type="button" className="btn btn-dark btn-sm" onClick={sync}>
          Sync git
        </button>
        <a
          className="btn btn-secondary btn-sm"
          href={`/admin/api/projects/${project.id}/export.json`}
        >
          Экспорт JSON
        </a>
        {message ? (
          <span className="form-status" style={{ marginTop: 0 }}>
            {message}
          </span>
        ) : null}
      </div>
    </article>
  );
}
