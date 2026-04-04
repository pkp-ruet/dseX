"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isRanking = pathname === "/dsestockranking";

  return (
    <header className="fixed top-1 left-0 right-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="navbar-brand">
          <svg className="navbar-brand-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
          </svg>
          <span className="navbar-brand-dse">dse</span>
          <span className="navbar-brand-score">Score</span>
        </Link>
        <nav>
          <Link
            href="/dsestockranking"
            className={`navbar-rank-btn${isRanking ? " navbar-rank-btn-active" : ""}`}
          >
            Score Leaderboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
