import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="np-footer-modern">
          <div className="np-footer-brand">TopStockBD</div>
          <div className="np-footer-tagline">Fundamental scoring for Dhaka&apos;s market</div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 text-xs text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
            <Link href="/dsestockranking" className="hover:text-[var(--primary)] transition-colors">Stock Rankings</Link>
            <Link href="/market-intelligence" className="hover:text-[var(--primary)] transition-colors">Market Intelligence</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
