import { T } from "@/components/i18n/T";
import { t, type CopyKey } from "@/lib/home-copy";

/**
 * `tt("showAll", { n: 12 })` — a dashboard copy key in both languages as a
 * `<T>`, for visible text. Use `t(lang, key)` only for attributes and logic.
 */
export function tt(key: CopyKey, vars?: Record<string, string | number>) {
  return <T en={t("en", key, vars)} bn={t("bn", key, vars)} />;
}
