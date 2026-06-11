"use client";

import { useState } from "react";

const FILLED = "#F59E0B"; // amber — warm accent, reads on the light theme

export default function StarRating({
  value,
  onChange,
  size = 32,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => !disabled && setHover(0)}
          onClick={() => !disabled && onChange(n)}
          className="rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-default"
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={n <= active ? FILLED : "none"}
            stroke={n <= active ? FILLED : "var(--border)"}
            strokeWidth="1.6"
            className="block"
          >
            <path
              d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95z"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
