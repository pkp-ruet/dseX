import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="np-footer-modern">
          <div className="np-footer-brand">TopStockBD</div>
          <div className="np-footer-tagline">Fundamental scoring for Dhaka&apos;s market</div>
          <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed mt-2 mb-1 max-w-lg mx-auto">
            TopStockBD covers <strong>DSE share price</strong> today, <strong>Dhaka Stock Exchange</strong> (DSEX) live data,{" "}
            <strong>Bangladesh stock market</strong> rankings, <strong>DSE news</strong>, BD stock market signals,{" "}
            and <strong>DSE share price list</strong> — free fundamental analysis for every listed company.{" "}
            Learn <strong>how to invest in DSE</strong>, <strong>how to buy shares in Bangladesh</strong>,{" "}
            how to open a BO account, find <strong>best stocks in Bangladesh</strong>,{" "}
            <strong>dividend stocks</strong>, <strong>blue chip stocks Bangladesh</strong>,{" "}
            and <strong>undervalued stocks DSE</strong> using P/E ratio and fundamental analysis.
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 text-xs text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
            <Link href="/dsestockranking" className="hover:text-[var(--primary)] transition-colors">Stock Rankings</Link>
            <Link href="/learn" className="hover:text-[var(--primary)] transition-colors">Beginner&apos;s Guide</Link>
            <Link href="/stock-insights" className="hover:text-[var(--primary)] transition-colors">Stock Insights</Link>
            <Link href="/market-analysis" className="hover:text-[var(--primary)] transition-colors">Market Analysis</Link>
            <Link href="/about" className="hover:text-[var(--primary)] transition-colors">Behind the Score</Link>
          </nav>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-2 text-[11px] text-[var(--text-muted)] opacity-70">
            <Link href="/about" className="hover:text-[var(--primary)] transition-colors">About Us</Link>
            <Link href="/contact" className="hover:text-[var(--primary)] transition-colors">Contact</Link>
            <Link href="/privacy-policy" className="hover:text-[var(--primary)] transition-colors">Privacy Policy</Link>
            <Link href="/disclaimer" className="hover:text-[var(--primary)] transition-colors">Disclaimer</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
