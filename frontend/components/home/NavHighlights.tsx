import Link from "next/link";

type NavItem = {
  href: string;
  title: string;
  desc: string;
  iconPath: string;
  color: string;
  bgColor: string;
  borderColor: string;
  titleColor: string;
};

const items: NavItem[] = [
  {
    href: "/dsestockranking",
    title: "Score Leaderboard",
    desc: "Best stocks ranked by fundamentals — top stocks DSE, blue chip, undervalued picks",
    iconPath: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 group-hover:bg-emerald-500/15",
    borderColor: "border-emerald-500/30 group-hover:border-emerald-500/60",
    titleColor: "text-emerald-400",
  },
  {
    href: "/dse-today",
    title: "DSE Today",
    desc: "Last trading day — DSEX index, breadth, top movers, sector heatmap, day's news",
    iconPath: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    color: "text-sky-500",
    bgColor: "bg-sky-500/10 group-hover:bg-sky-500/15",
    borderColor: "border-sky-500/30 group-hover:border-sky-500/60",
    titleColor: "text-sky-400",
  },
  {
    href: "/market-analysis",
    title: "Market Analysis",
    desc: "Top gainers and losers today — live Bangladesh stock signals and market condition",
    iconPath: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 group-hover:bg-orange-500/15",
    borderColor: "border-orange-500/30 group-hover:border-orange-500/60",
    titleColor: "text-orange-400",
  },
  {
    href: "/stock-insights",
    title: "Stock Picks",
    desc: "Top-20 curated insights: dividend stocks, high yield DSE, undervalued opportunities",
    iconPath: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10 group-hover:bg-violet-500/15",
    borderColor: "border-violet-500/30 group-hover:border-violet-500/60",
    titleColor: "text-violet-400",
  },
  {
    href: "/learn",
    title: "Beginner's Guide",
    desc: "How to invest in DSE, buy shares, open BO account — Bangladesh stock market guide",
    iconPath: "M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10 group-hover:bg-teal-500/15",
    borderColor: "border-teal-500/30 group-hover:border-teal-500/60",
    titleColor: "text-teal-400",
  },
  {
    href: "/about",
    title: "Behind the Score",
    desc: "DSE fundamental analysis explained — P/E ratio, DSEF 5-pillar scoring methodology",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 group-hover:bg-indigo-500/15",
    borderColor: "border-indigo-500/30 group-hover:border-indigo-500/60",
    titleColor: "text-indigo-400",
  },
];

export default function NavHighlights() {
  return (
    <section className="mt-10 mb-4">
      {/* Section header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-sky-500" />
          <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
            Explore TopStockBD
          </h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] ml-3 pl-0.5">
          Everything you need to navigate the Dhaka Stock Exchange
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map(({ href, title, desc, iconPath, color, bgColor, borderColor, titleColor }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-start gap-3 p-4 rounded-xl border ${borderColor} ${bgColor} transition-all duration-200`}
          >
            <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg bg-[var(--bg)] ${color}`}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={iconPath} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-base ${titleColor} leading-snug`}>{title}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`shrink-0 mt-1 text-[var(--text-muted)] group-hover:${color} transition-colors`}
              aria-hidden="true"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
