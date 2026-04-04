import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-1 left-0 right-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center">
        <Link href="/" className="navbar-brand">
          <span className="navbar-brand-dse">dse</span>
          <span className="navbar-brand-score">Score</span>
        </Link>
      </div>
    </header>
  );
}
