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
      className="rounded-[var(--radius)] border border-[var(--border)] bg-white overflow-hidden"
      style={{ borderLeft: "3px solid var(--primary)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium leading-snug">{title}</span>
        <span className="text-xs text-[var(--text-muted)] shrink-0 mt-0.5 px-2 py-0.5 rounded-full bg-[var(--border)]">
          {formatDate(postDate)}
        </span>
      </button>
      {body && (
        <div
          className={`px-3 pb-3 text-xs text-[var(--text-muted)] leading-relaxed transition-all ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {body}
        </div>
      )}
      {body && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs text-[var(--primary)] font-medium px-3 pb-2 text-left hover:underline"
        >
          Read more
        </button>
      )}
    </div>
  );
}
