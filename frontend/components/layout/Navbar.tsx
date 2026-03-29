import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-1 left-0 right-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-[var(--primary)]">
          dseX
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            Rankings
          </Link>
          <Link href="/audit" className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            Audit
          </Link>
        </nav>
      </div>
    </header>
  );
}
