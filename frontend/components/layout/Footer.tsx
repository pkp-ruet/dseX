import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-12 py-6">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
        <div>
          <span className="font-bold text-[var(--primary)]">dseX</span>
          {" "}— Driven by fundamentals · Designed for long-term winners
        </div>
        <div className="flex gap-4">
          <Link href="/audit" className="hover:text-[var(--primary)] transition-colors">
            Data Audit
          </Link>
        </div>
      </div>
    </footer>
  );
}
