"use client";
import { useState } from "react";
import { formatDate } from "@/lib/formatters";
import { classifyNews } from "@/lib/news-kind";

interface Props {
  title: string;
  body: string;
  postDate: string;
}

export default function NewsCard({ title, body, postDate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const kind = classifyNews(title);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${kind.color}`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors"
        style={{ background: expanded ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent" }}
      >
        <span className="min-w-0">
          <span
            className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full mb-1.5"
            style={{
              color: kind.color,
              background: `color-mix(in srgb, ${kind.color} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${kind.color} 25%, transparent)`,
            }}
          >
            {kind.label}
          </span>
          <span className="block text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
            {title}
          </span>
        </span>
        <span
          className="text-[11px] font-bold shrink-0 mt-0.5 px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
        >
          {formatDate(postDate)}
        </span>
      </button>
      {body && (
        <div
          className={`px-4 pb-3 text-sm leading-relaxed transition-all ${expanded ? "" : "line-clamp-2"}`}
          style={{ color: "var(--text-muted)" }}
        >
          {body}
        </div>
      )}
      {body && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs font-semibold px-4 pb-3 text-left transition-colors"
          style={{ color: "var(--primary)" }}
        >
          Read more →
        </button>
      )}
    </div>
  );
}
