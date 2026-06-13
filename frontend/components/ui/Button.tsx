import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "warm" | "ghost" | "tab";
type Size = "sm" | "md";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** For tab variant — highlights the active tab. */
  active?: boolean;
  /** Render as a Next.js link instead of a button. */
  href?: string;
  className?: string;
}

/**
 * Shared button. Variants: primary (indigo), warm (amber accent — use sparingly),
 * ghost (outlined), tab (pill toggle). Renders an <a> when `href` is set.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  active = false,
  href,
  className = "",
  ...rest
}: Props) {
  const cls = `ui-btn ui-btn-${size} ui-btn-${variant} ${active ? "is-active" : ""} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
