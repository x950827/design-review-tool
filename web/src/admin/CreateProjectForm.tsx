import { FormEvent, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { translateError } from "../messages";
import { Field, FormError } from "../ui";

export function CreateProjectForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");
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
            { key: "a", label: t("variantLabelA"), git_path: pathA },
            { key: "b", label: t("variantLabelB"), git_path: pathB },
          ],
        }),
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
  }

  return (
    <section className="card-flat motion-in-scale motion-d2">
      <h2 className="section-h2">{t("newProject")}</h2>
      <form onSubmit={onSubmit}>
        <Field label={t("fieldTitle")} htmlFor="project-title">
          <input
            className="input"
            id="project-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("fieldSlug")} htmlFor="project-slug">
          <input
            className="input num"
            id="project-slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("fieldGitUrl")} htmlFor="project-git">
          <input
            className="input num"
            id="project-git"
            value={gitUrl}
            onChange={(event) => setGitUrl(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("fieldBranch")} htmlFor="project-branch">
          <input
            className="input num"
            id="project-branch"
            placeholder={t("placeholderBranch")}
            value={branch}
            onChange={(event) => setBranch(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("fieldPathA")} htmlFor="project-path-a">
          <input
            className="input num"
            id="project-path-a"
            value={pathA}
            onChange={(event) => setPathA(event.currentTarget.value)}
          />
        </Field>
        <Field label={t("fieldPathB")} htmlFor="project-path-b">
          <input
            className="input num"
            id="project-path-b"
            value={pathB}
            onChange={(event) => setPathB(event.currentTarget.value)}
          />
        </Field>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary">
          {t("createProject")}
        </button>
      </form>
    </section>
  );
}
