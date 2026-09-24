export type Locale = "en" | "ru";

export function resolveLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === "en" || saved === "ru") return saved;
  const first = languages[0] ?? "";
  return first.toLowerCase().startsWith("ru") ? "ru" : "en";
}
