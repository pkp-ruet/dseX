import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

/**
 * Roles: primary (filled clay) · quiet (outlined) · link (text only) · danger
 * (filled negative — destructive confirms) · tab (segmented-control member,
 * pair with `active`).
 */
type Variant = "primary" | "quiet" | "link" | "danger" | "tab";
type Size = "sm" | "md" | "lg";

interface BaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: Variant;
  /** sm 36px · md 40px (default) · lg 48px. */
  size?: Size;
  /** Full-width. */
  block?: boolean;
  /** Toggled state — highlights a tab, or marks a quiet button "on" (saved, armed). */
  active?: boolean;
  /** Render as a Next.js link instead of a button. */
  href?: string;
  className?: string;
}

/** Icon-only buttons are square and MUST carry an aria-label — the type enforces it. */
type IconOnlyProps = BaseProps & { iconOnly: true; "aria-label": string };
type TextProps = BaseProps & { iconOnly?: false };
export type ButtonProps = IconOnlyProps | TextProps;

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  quiet: "btn-quiet",
  link: "btn-link",
  danger: "btn-danger",
  tab: "btn-tab",
};

const SIZE_CLASS: Record<Size, string> = { sm: " btn-sm", md: "", lg: " btn-lg" };

/**
 * THE button. Emits the role-named `.btn-*` classes (globals.css + styles/states.css)
 * so every button in the app shares one height scale, weight, radius and focus ring.
 * Renders an <a> when `href` is set.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  active = false,
  iconOnly = false,
  href,
  className = "",
  ...rest
}: ButtonProps) {
  const cls = [
    VARIANT_CLASS[variant] + SIZE_CLASS[size],
    block ? "btn-block" : "",
    iconOnly ? "btn-icon" : "",
    active ? "is-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const { "aria-label": ariaLabel, title } = rest as { "aria-label"?: string; title?: string };
    return (
      <Link href={href} className={cls} aria-label={ariaLabel} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button type={rest.type ?? "button"} {...rest} className={cls}>
      {children}
    </button>
  );
}
