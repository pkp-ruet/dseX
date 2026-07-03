import type { CSSProperties } from "react";
import type { MarketMood } from "@/lib/api";

const CHIP_ACCENT: Record<string, string> = {
  "Prices this year": "var(--primary)",
  Today: "var(--warm)",
  "Price tags": "var(--positive)",
  "How people feel": "#6D28D9",
};

// One reassuring Bangla line per mood tone, echoing the English takeaway.
const MOOD_BN: Record<string, string> = {
  up: "বাজার আজ চাঙা — বেশিরভাগ শেয়ারের দাম বাড়ছে।",
  down: "বাজার আজ পড়তির দিকে — তাড়াহুড়ো করবেন না।",
  weak: "বাজার কিছুটা দুর্বল — ভালো কোম্পানি বেছে নেওয়ার সময়।",
  steady: "বাজার আজ শান্ত — ধীরে-সুস্থে দেখে নিন।",
};

/**
 * The big picture — a bold gradient hero: the market mood, a large headline,
 * a friendly takeaway, and four colourful "at a glance" tiles.
 */
export default function BigPicture({ mood }: { mood: MarketMood }) {
  return (
    <section className={`ms-hero ms-hero--${mood.tone}`}>
      <span className="ms-hero-eyebrow">The big picture</span>
      <div>
        <span className={`ms-mood-pill ms-mood-pill--${mood.tone}`}>
          <span className="ms-dot" aria-hidden="true" />
          Right now: {mood.label.toLowerCase()}
        </span>
      </div>
      <h2 className="ms-hero-headline">{mood.sentence}</h2>
      {mood.sentence2 && <p className="ms-hero-sub">{mood.sentence2}</p>}
      {MOOD_BN[mood.tone] && (
        <p lang="bn" className="font-bn ms-hero-bn">
          {MOOD_BN[mood.tone]}
        </p>
      )}
      <div className="ms-hero-stats">
        {(mood.chips ?? []).map((c) => (
          <div
            className="ms-stat"
            key={c.label}
            style={{ "--ms-accent": CHIP_ACCENT[c.label] ?? "var(--primary)" } as CSSProperties}
          >
            <p className="ms-stat-label">{c.label}</p>
            <p className="ms-stat-value">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
