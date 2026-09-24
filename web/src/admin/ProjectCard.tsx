import { FormEvent, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { fill, translateError } from "../messages";
import type { Project } from "../types";

export function ProjectCard({
  project,
  onChange,
}: {
  project: Project;
  onChange: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  async function addReviewer(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/admin/api/projects/${project.id}/reviewers`, {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      setName("");
      setPassword("");
      setMessage("");
      await onChange();
    } catch (err) {
      setMessage(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
  }

  async function sync() {
    setMessage(t("syncing"));
    try {
      const data = await api(`/admin/api/projects/${project.id}/sync`, { method: "POST" });
      setMessage(fill(t("commitCount"), { count: data.history?.length ?? 0 }));
    } catch (err) {
      setMessage(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${project.slug}`);
      setMessage(t("copied"));
    } catch {
      setMessage(t("copyFailed"));
    }
  }

  async function setDisabled(reviewerId: number, disabled: boolean) {
    try {
      await api(`/admin/api/projects/${project.id}/reviewers/${reviewerId}/disable`, {
        method: "POST",
        body: JSON.stringify({ disabled }),
      });
      setMessage("");
      await onChange();
    } catch (err) {
      setMessage(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
  }

  async function savePassword(event: FormEvent, reviewerId: number) {
    event.preventDefault();
    try {
      await api(`/admin/api/projects/${project.id}/reviewers/${reviewerId}/reset`, {
        method: "POST",
        body: JSON.stringify({ password: resetPassword }),
      });
      setResetId(null);
      setResetPassword("");
      setMessage("");
      await onChange();
    } catch (err) {
      setMessage(err instanceof Error ? translateError(err.message, t) : t("errGeneric"));
    }
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
        <span className="num">{project.git_url}</span> · <span className="num">{project.branch}</span>
      </p>
      <p className="project-meta">{fill(t("openCount"), { count: project.open_count })}</p>
      <div className="project-tags">
        {project.variants.map((variant) => (
          <span className="tag" key={variant.key}>
            {variant.label} ({variant.git_path})
          </span>
        ))}
      </div>
      <p className="accounts-label">{t("accounts")}</p>
      <ul className="accounts">
        {project.reviewers.length ? (
          project.reviewers.map((reviewer) => (
            <li className={reviewer.disabled ? "off" : undefined} key={reviewer.id}>
              {reviewer.name}
              {reviewer.disabled ? <span className="tag tag-muted">({t("off")})</span> : null}
              {reviewer.name === "admin" ? (
                <span className="project-meta">{t("adminPasswordNote")}</span>
              ) : (
                <span className="card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDisabled(reviewer.id, reviewer.disabled === 0)}
                  >
                    {reviewer.disabled ? t("enable") : t("disable")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setResetId(reviewer.id);
                      setResetPassword("");
                    }}
                  >
                    {t("resetPassword")}
                  </button>
                  {resetId === reviewer.id ? (
                    <form onSubmit={(event) => savePassword(event, reviewer.id)}>
                      <input
                        className="input"
                        type="password"
                        aria-label={t("password")}
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.currentTarget.value)}
                      />
                      <button type="submit" className="btn btn-secondary btn-sm">
                        {t("savePassword")}
                      </button>
                    </form>
                  ) : null}
                </span>
              )}
            </li>
          ))
        ) : (
          <li className="off">{t("none")}</li>
        )}
      </ul>
      <form className="inline-form" onSubmit={addReviewer}>
        <input
          className="input"
          placeholder={t("reviewerName")}
          aria-label={t("reviewerName")}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <input
          className="input"
          placeholder={t("password")}
          type="password"
          aria-label={t("password")}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          {t("addAccount")}
        </button>
      </form>
      <div className="card-actions">
        <button type="button" className="btn btn-dark btn-sm" onClick={sync}>
          {t("syncGit")}
        </button>
        <a className="btn btn-secondary btn-sm" href={`/admin/api/projects/${project.id}/export.json`}>
          {t("exportJson")}
        </a>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
          {t("copyLink")}
        </button>
        {message ? (
          <span className="form-status" style={{ marginTop: 0 }}>
            {message}
          </span>
        ) : null}
      </div>
    </article>
  );
}
