import Skeleton from "@/components/ui/Skeleton";

type Variant = "table" | "cards" | "hero";

interface Props {
  /** Rough page shape while the data fetch is in flight. */
  variant?: Variant;
  /** Table rows / card count. */
  rows?: number;
}

/**
 * Route-level loading placeholder shared by every data page (`loading.tsx`).
 * Three shapes cover the app: a sortable table (rankings, A–Z), a card grid
 * (sectors, lists), and a hero + list (DSE Today, calendar, market analysis).
 * Rendered by Next while the server component awaits the backend — the Render
 * free tier can take several seconds to wake, so a blank main area read as
 * "broken". Keep it quiet: no text, no spinners, just the page's outline.
 */
export default function PageSkeleton({ variant = "table", rows = 8 }: Props) {
  return (
    <div className="py-6 sm:py-8" role="status" aria-live="polite" aria-label="Loading">
      {/* Page head */}
      <div className="mb-6 flex flex-col gap-2.5">
        <Skeleton width={120} height={12} rounded="6px" />
        <Skeleton width="55%" height={34} rounded="10px" />
        <Skeleton width="80%" height={14} />
      </div>

      {variant === "hero" && (
        <div className="mb-6 soft-card p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton width={90} height={12} />
              <Skeleton width={160} height={38} rounded="10px" />
            </div>
            <Skeleton width={110} height={28} rounded="999px" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton width="60%" height={11} />
                <Skeleton width="80%" height={22} />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="soft-card p-4">
              <div className="flex items-center justify-between">
                <Skeleton width="50%" height={16} />
                <Skeleton width={44} height={22} rounded="999px" />
              </div>
              <Skeleton width="85%" height={12} className="mt-3" />
              <Skeleton width="70%" height={12} className="mt-2" />
              <div className="mt-4 flex gap-2">
                <Skeleton width={60} height={20} rounded="999px" />
                <Skeleton width={60} height={20} rounded="999px" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="soft-card overflow-hidden">
          {variant === "table" && (
            <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-3">
              <Skeleton width="40%" height={34} rounded="10px" />
              <Skeleton width={140} height={34} rounded="10px" />
              <Skeleton width={110} height={34} rounded="10px" />
            </div>
          )}
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton width={28} height={28} rounded="8px" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton width={i % 3 === 0 ? "38%" : "30%"} height={13} />
                  <Skeleton width={i % 2 === 0 ? "55%" : "45%"} height={11} />
                </div>
                <Skeleton width={56} height={14} className="hidden sm:block" />
                <Skeleton width={64} height={14} />
                <Skeleton width={48} height={22} rounded="999px" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
