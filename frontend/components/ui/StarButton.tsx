"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isWatched, toggleWatchlistSynced, subscribeWatchlist } from "@/lib/watchlist";
import { isLoggedIn } from "@/lib/auth";

interface Props {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function StarButton({ code, size = "sm", className = "" }: Props) {
  const router = useRouter();
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatched(isWatched(code));
    return subscribeWatchlist(() => setWatched(isWatched(code)));
  }, [code]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    toggleWatchlistSynced(code).then((nowWatched) => setWatched(nowWatched));
  };

  const dim = size === "lg" ? 22 : size === "md" ? 18 : 14;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={watched ? `Remove ${code} from watchlist` : `Add ${code} to watchlist`}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={`star-btn ${watched ? "star-btn--on" : ""} ${className}`}
      style={{ visibility: mounted ? "visible" : "hidden" }}
    >
      <svg width={dim} height={dim} viewBox="0 0 24 24" fill={watched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
