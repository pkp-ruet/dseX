import PromoPill from "./PromoPill";

/**
 * Bengali promo pill linking to the "how to find good stocks with TopStockBD"
 * guide. Rendered between the hero/ranking preview and the search section on
 * the marketing homepage. Indigo (brand) accent to distinguish it from the
 * emerald blog strip above the hero.
 */
const TargetIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.6" />
  </svg>
);

export default function FindStocksPromoStrip({ className = "" }: { className?: string }) {
  return (
    <PromoPill
      href="/blog/find-good-stocks-with-topstockbd"
      ariaLabel="TopStockBD থেকে ভালো শেয়ার খুঁজবেন যেভাবে"
      icon={TargetIcon}
      text="TopStockBD থেকে ভালো শেয়ার খুঁজবেন যেভাবে"
      tag="গাইড"
      accentVar="var(--primary)"
      className={className}
    />
  );
}
