import { T } from "@/components/i18n/T";
import { IconLock } from "@/components/ui/icons";

/** The grey bar's width follows the hidden name's length, so a list of
 *  masked rows doesn't read as one repeated shape. */
export function maskWidth(name: string | null | undefined): number {
  return Math.max(96, Math.min(190, (name ?? "").length * 6));
}

/**
 * Where a company's name would be, in a free reader's preview of a locked
 * row (2026-10-28): a grey bar and a lock, and "Company shown in Premium" for
 * screen readers. The row keeps every figure; only who it is stays hidden.
 * Never pass the real name into the markup — only its length.
 */
export default function MaskedName({ name, className = "" }: { name?: string | null; className?: string }) {
  return (
    <span className={`lk-name ${className}`.trim()}>
      <span className="lk-mask" style={{ width: `${maskWidth(name)}px` }} aria-hidden="true" />
      <IconLock size={14} />
      <span className="sr-only">
        <T en="Company shown in Premium" bn="কোম্পানির নাম প্রিমিয়ামে" />
      </span>
    </span>
  );
}
