import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

/**
 * "এক নজরে" — a plain-Bangla at-a-glance summary of the stock, generated
 * post-scrape and cached on the backend. Educational, not investment advice.
 * Renders nothing when no summary is available (e.g. unscored stocks).
 *
 * Wrapped in `.font-bn` + `lang="bn"` so the Bengali webfont (Hind Siliguri)
 * is applied; server-rendered for crawlers.
 */
export default function BengaliSummary({ detail }: Props) {
  const summary = detail.bengali_summary?.trim();
  if (!summary) return null;

  // The model returns 3–5 sentences as prose; split on blank lines into
  // paragraphs if present, otherwise render as one paragraph.
  const paragraphs = summary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section
      lang="bn"
      className="font-bn rounded-3xl mb-8 p-5 sm:p-7"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "var(--primary)" }}
        />
        <h2 className="text-lg sm:text-xl font-semibold" style={{ color: "var(--text)" }}>
          এক নজরে
        </h2>
      </div>

      <div className="space-y-3 leading-relaxed" style={{ color: "var(--text)" }}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
        এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।
      </p>
    </section>
  );
}
