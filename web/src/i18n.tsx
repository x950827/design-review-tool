import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveLocale, type Locale } from "./locale";
import { en, ru, type MessageKey } from "./messages";

const STORAGE_KEY = "dr-locale";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(localStorage.getItem(STORAGE_KEY), navigator.languages),
  );

  function setLocale(next: Locale) {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const catalog = locale === "ru" ? ru : en;
    return {
      locale,
      setLocale,
      t: (key) => catalog[key],
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n requires I18nProvider");
  return value;
}

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="seg lang-seg" role="group" aria-label={t("language")}>
      {(["en", "ru"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
