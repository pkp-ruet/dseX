"use client";
import { useState } from "react";
import { formatDate } from "@/lib/formatters";

interface Props {
  title: string;
  body: string;
  postDate: string;
}

export default function NewsCard({ title, body, postDate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors"
        style={{ background: expanded ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent" }}
      >
        <span className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {title}
        </span>
        <span
          className="text-[10px] font-bold shrink-0 mt-0.5 px-2.5 py-1 rounded-full whitespace-nowrap"
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
