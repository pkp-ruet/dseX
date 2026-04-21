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
        background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
        border: "1px solid #1E3A5F",
        borderLeft: "3px solid #0EA5E9",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors"
        style={{ background: expanded ? "rgba(14,165,233,0.04)" : "transparent" }}
      >
        <span className="text-sm font-semibold leading-snug" style={{ color: "#E2E8F0" }}>
          {title}
        </span>
        <span
          className="text-[10px] font-bold shrink-0 mt-0.5 px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: "rgba(14,165,233,0.1)", color: "#38BDF8", border: "1px solid rgba(14,165,233,0.2)" }}
        >
          {formatDate(postDate)}
        </span>
      </button>
      {body && (
        <div
          className={`px-4 pb-3 text-xs leading-relaxed transition-all ${expanded ? "" : "line-clamp-2"}`}
          style={{ color: "#94A3B8" }}
        >
          {body}
        </div>
      )}
      {body && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs font-semibold px-4 pb-3 text-left transition-colors"
          style={{ color: "#0EA5E9" }}
        >
          Read more →
        </button>
      )}
    </div>
  );
}
