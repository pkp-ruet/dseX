import Link from "next/link";
import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";

interface Action {
  href?: string;
  onClick?: () => void;
  label: string;
  primary?: boolean;
}

interface Props {
  /** English headline, plain words. */
  title: string;
  /** One English sentence saying what to do next. */
  message?: string;
  /** One simple Bengali line. */
  bn?: string;
  /** Up to two actions; the first is styled as primary unless told otherwise. */
  actions?: Action[];
  /** Optional illustration / icon slot above the title. */
  icon?: ReactNode;
  /** `card` = bordered surface; `bare` = no chrome (inside a table cell). */
  variant?: "card" | "bare";
  className?: string;
}

/**
 * Shared "nothing here yet" block. One sentence, one Bengali line, one button
 * that leads somewhere useful — never a dead end. Used for empty portfolios,
 * alerts, filtered-to-zero tables and the like.
 */
export default function EmptyState({
  title,
  message,
  bn,
  actions = [],
  icon,
  variant = "card",
  className = "",
}: Props) {
  return (
    <div className={`empty-state ${variant === "card" ? "empty-state--card" : ""} ${className}`.trim()}>
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-msg">{message}</p>}
      {bn && <Bn className="empty-state-bn">{bn}</Bn>}
      {actions.length > 0 && (
        <div className="empty-state-actions">
          {actions.map((a, i) => {
            const cls = (a.primary ?? i === 0) ? "btn-primary" : "btn-quiet";
            return a.href ? (
              <Link key={a.label} href={a.href} className={cls}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
