"use client";

type SortKey = "score" | "change_pct" | "div_yield_pct";

interface Props {
  sectors: string[];
  activeSector: string | null;
  activeCategory: string | null;
  activeSort: SortKey;
  onSectorChange: (sector: string | null) => void;
  onCategoryChange: (cat: string | null) => void;
  onSortChange: (sort: SortKey) => void;
}

const CATEGORIES = ["A", "B", "N", "Z"] as const;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "change_pct", label: "Change %" },
  { key: "div_yield_pct", label: "Div Yield" },
];

export default function FilterBar({
  sectors,
  activeSector,
  activeCategory,
  activeSort,
  onSectorChange,
  onCategoryChange,
  onSortChange,
}: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-row">
        <select
          className="filter-sector-select"
          value={activeSector ?? ""}
          onChange={(e) => onSectorChange(e.target.value || null)}
        >
          <option value="">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="filter-cat-group">
          <button
            type="button"
            className={`filter-cat-pill ${activeCategory === null ? "filter-cat-pill-active" : ""}`}
            onClick={() => onCategoryChange(null)}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-cat-pill ${activeCategory === cat ? "filter-cat-pill-active" : ""}`}
              onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <span className="filter-label">Sort by</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`filter-sort-btn ${activeSort === opt.key ? "filter-sort-btn-active" : ""}`}
            onClick={() => onSortChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
