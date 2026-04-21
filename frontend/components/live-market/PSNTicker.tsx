"use client";
import type { LiveNewsItem } from "@/lib/api";

interface Props {
  news: LiveNewsItem[];
}

export default function PSNTicker({ news }: Props) {
  if (!news || news.length === 0) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
      <div className="flex items-center">
        <div className="shrink-0 bg-[var(--accent)] text-white text-xs font-bold px-3 py-2.5 uppercase tracking-wide">
          PSN
        </div>
        <div className="overflow-hidden relative flex-1 py-2.5 px-3">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{ animation: "psn-scroll 40s linear infinite" }}
          >
            {news.concat(news).map((item, i) => (
              <span key={i} className="text-xs text-[var(--text)] inline-flex items-center gap-2 shrink-0">
                {item.code && (
                  <span className="font-semibold text-[var(--accent)]">[{item.code}]</span>
                )}
                {item.title}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes psn-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
