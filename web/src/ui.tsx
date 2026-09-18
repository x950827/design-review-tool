import { ChangeEvent, ReactNode, useEffect, useId, useRef, useState } from "react";

export function FormError({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!message || !el) return;
    el.classList.remove("is-shake");
    void el.offsetWidth;
    el.classList.add("is-shake");
  }, [message]);
  if (!message) return null;
  return (
    <div ref={ref} className="form-error is-entering" role="alert">
      {message}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={inputId}>
      <div className="password-wrap">
        <input
          className="input"
          id={inputId}
          name="password"
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.currentTarget.value)
          }
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((open) => !open)}
        >
          {visible ? "Скрыть" : "Показать"}
        </button>
      </div>
    </Field>
  );
}
