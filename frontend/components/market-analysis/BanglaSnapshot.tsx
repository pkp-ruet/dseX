import type { CSSProperties } from "react";

/**
 * "আজকের বাজার এক নজরে" — the whole market in a short everyday-Bangla
 * paragraph, template-rendered on the backend. Server-rendered so crawlers
 * see real Bengali prose. Renders nothing when the backend has no summary.
 */
export default function BanglaSnapshot({ text }: { text: string }) {
  return (
    <section
      lang="bn"
      className="font-bn ms-card ms-card--tint"
      style={{ marginTop: 16, "--card-accent": "var(--primary)" } as CSSProperties}
    >
      <p className="ms-card-title">আজকের বাজার এক নজরে</p>
      <p className="ms-bn-text">{text}</p>
      <p className="ms-bn-note">এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।</p>
    </section>
  );
}
