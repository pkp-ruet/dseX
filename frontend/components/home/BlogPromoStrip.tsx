import PromoPill from "./PromoPill";

/**
 * Slim Bengali announcement strip for the top of the marketing homepage.
 * Single catchy line → /blog. Rendered above the hero (logged-out landing +
 * crawlers via HomePersonalizationGate). Emerald accent (learning / growth).
 */
const BookIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export default function BlogPromoStrip() {
  return (
    <PromoPill
      href="/blog"
      ariaLabel="বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার শিখুন, ফ্রি"
      icon={BookIcon}
      text="শেয়ার মার্কেট শিখুন — একদম শুরু থেকে"
      tag="ফ্রি"
      accentVar="var(--positive)"
      className="pt-4 sm:pt-5"
    />
  );
}
