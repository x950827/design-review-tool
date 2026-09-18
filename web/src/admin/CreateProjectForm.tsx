import { FormEvent, useState } from "react";
import { api } from "../api";
import { Field, FormError } from "../ui";

export function CreateProjectForm({ onCreated }: { onCreated: () => Promise<void> }) {
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
    <section className="card-flat motion-in-scale motion-d2">
      <h2 className="section-h2">Новый проект</h2>
      <form onSubmit={onSubmit}>
        <Field label="Название" htmlFor="project-title">
          <input
            className="input"
            id="project-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </Field>
        <Field label="Slug" htmlFor="project-slug">
          <input
            className="input num"
            id="project-slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </Field>
        <Field label="Git URL" htmlFor="project-git">
          <input
            className="input num"
            id="project-git"
            value={gitUrl}
            onChange={(event) => setGitUrl(event.currentTarget.value)}
          />
        </Field>
        <Field label="Ветка" htmlFor="project-branch">
          <input
            className="input num"
            id="project-branch"
            value={branch}
            onChange={(event) => setBranch(event.currentTarget.value)}
          />
        </Field>
        <Field label="Путь варианта A" htmlFor="project-path-a">
          <input
            className="input num"
            id="project-path-a"
            value={pathA}
            onChange={(event) => setPathA(event.currentTarget.value)}
          />
        </Field>
        <Field label="Путь варианта B" htmlFor="project-path-b">
          <input
            className="input num"
            id="project-path-b"
            value={pathB}
            onChange={(event) => setPathB(event.currentTarget.value)}
          />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary">
          Создать
        </button>
      </form>
    </section>
  );
}
