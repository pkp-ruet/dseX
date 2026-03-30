export default function Masthead() {
  return (
    <div className="masthead masthead-modern mb-1">
      <div className="masthead-eyebrow">Dhaka Stock Exchange · Fundamental Intelligence</div>
      <div className="masthead-headline">
        <span className="masthead-tagline">
          Driven by fundamentals
          <span className="masthead-tagline-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          Designed for long-term winners.
        </span>
      </div>
    </div>
  );
}
