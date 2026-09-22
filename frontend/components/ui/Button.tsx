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

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  warm: "btn-primary", // the warm variant collapsed into primary in the 2026-09-22 button unification
  ghost: "btn-quiet",
  tab: "btn-tab",
};

/**
 * Shared button — emits the role-named `.btn-*` classes from globals.css so every
 * button in the app shares one height scale, weight and focus ring.
 * Variants: primary (filled clay), ghost (quiet outlined), tab (segmented pill).
 * Renders an <a> when `href` is set.
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
  const cls = `${VARIANT_CLASS[variant]}${size === "sm" ? " btn-sm" : ""}${active ? " is-active" : ""} ${className}`.trim();

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
