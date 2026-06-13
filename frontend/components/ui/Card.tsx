import type { ReactNode, ElementType } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the hover-lift transition (shadow + subtle raise). */
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: ElementType;
}

const PAD: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

/** Surface card — white bg, hairline border, radius-lg, soft shadow. */
export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag className={`soft-card ${hover ? "hover-lift" : ""} ${PAD[padding]} ${className}`}>
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot (badge, action, etc.). */
  right?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, right, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-[var(--text)] truncate">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
