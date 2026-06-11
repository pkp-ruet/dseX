"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type TemplateKey = "showcase" | "top-ranked" | "top-20" | "rankings" | "stock" | "market" | "portfolio";

type Template = {
  key: TemplateKey;
  title: string;
  description: string;
  needsCode?: boolean;
  aspect?: "square" | "portrait";
};

const TEMPLATES: Template[] = [
  {
    key: "showcase",
    title: "All-in-One Showcase (Portrait)",
    description:
      "Whole-product promo: scores, rankings, watchlist & portfolio in one card. Mostly-live data. 4:5 portrait (1080×1350) — the brand showcase image.",
    aspect: "portrait",
  },
  {
    key: "top-ranked",
    title: "Top 10 Ranked (Portrait)",
    description:
      "Top 10 ranked DSE stocks, price only. 4:5 portrait (1080×1350) — best footprint in the Facebook feed.",
    aspect: "portrait",
  },
  {
    key: "top-20",
    title: "DSE Top 20 (Portrait)",
    description:
      "Top 5 of the DSE Top 20 — this week's 7-day momentum movers with returns. 4:5 portrait.",
    aspect: "portrait",
  },
  {
    key: "rankings",
    title: "Top Rankings",
    description: "Top 5 Strong Buy stocks with DSEF score and price.",
  },
  {
    key: "stock",
    title: "Stock Spotlight",
    description: "Single ticker — score, tier, price, pillar breakdown.",
    needsCode: true,
  },
  {
    key: "market",
    title: "Market Today",
    description: "DSEX index, breadth, top gainer / loser.",
  },
  {
    key: "portfolio",
    title: "Portfolio Teaser",
    description: "Mock portfolio with returns — promotes the tracker.",
  },
];

function buildUrl(key: TemplateKey, code: string, version: number): string {
  const base = `/api/og/promo/${key}`;
  const params = new URLSearchParams();
  if (key === "stock") params.set("code", code.toUpperCase() || "GP");
  params.set("v", String(version));
  return `${base}?${params.toString()}`;
}

async function downloadPng(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function AdminImagesClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [stockCode, setStockCode] = useState("GP");
  const [stockCodeDraft, setStockCodeDraft] = useState("GP");
  const [versions, setVersions] = useState<Record<TemplateKey, number>>({
    showcase: 1,
    "top-ranked": 1,
    "top-20": 1,
    rankings: 1,
    stock: 1,
    market: 1,
    portfolio: 1,
  });
  const [downloading, setDownloading] = useState<TemplateKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin)    { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const urls = useMemo(() => {
    return {
      showcase: buildUrl("showcase", stockCode, versions.showcase),
      "top-ranked": buildUrl("top-ranked", stockCode, versions["top-ranked"]),
      "top-20": buildUrl("top-20", stockCode, versions["top-20"]),
      rankings:  buildUrl("rankings",  stockCode, versions.rankings),
      stock:     buildUrl("stock",     stockCode, versions.stock),
      market:    buildUrl("market",    stockCode, versions.market),
      portfolio: buildUrl("portfolio", stockCode, versions.portfolio),
    } as Record<TemplateKey, string>;
  }, [stockCode, versions]);

  if (isLoading || (!isAdmin && isLoggedIn)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  function reload(key: TemplateKey) {
    setVersions((v) => ({ ...v, [key]: v[key] + 1 }));
  }

  function applyCode() {
    const next = stockCodeDraft.trim().toUpperCase() || "GP";
    setStockCode(next);
    setVersions((v) => ({ ...v, stock: v.stock + 1 }));
  }

  async function handleDownload(key: TemplateKey) {
    setError("");
    setDownloading(key);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const codePart = key === "stock" ? `-${stockCode.toUpperCase()}` : "";
      await downloadPng(urls[key], `topstockbd-${key}${codePart}-${ts}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="rank-page-header mb-6">
        <p className="rank-page-eyebrow">// ADMIN</p>
        <h1 className="rank-page-title">Promo Images</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Portrait 1080×1350 and square 1080×1080 cards for Facebook. Each image
          bakes in <span className="font-semibold">topstockbd.com</span> so the
          URL travels with the share.
        </p>
      </div>

      {error && (
        <p className="text-red-500 mb-4 text-sm">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map((t) => (
          <div
            key={t.key}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--text)]">
                  {t.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => reload(t.key)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-muted)]"
                title="Re-render with latest data"
              >
                Refresh
              </button>
            </div>

            {t.needsCode && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={stockCodeDraft}
                  onChange={(e) => setStockCodeDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                  placeholder="Trading code (e.g. GP)"
                  className="input-field flex-1 text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={applyCode}
                  className="text-sm px-4 rounded-md bg-[var(--primary,#1A6B5A)] text-white font-semibold hover:opacity-90"
                  style={{ background: "#1A6B5A" }}
                >
                  Render
                </button>
              </div>
            )}

            <div className={`bg-white border border-[var(--border)] rounded-xl overflow-hidden ${t.aspect === "portrait" ? "aspect-[4/5]" : "aspect-square"} flex items-center justify-center`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={urls[t.key]}
                src={urls[t.key]}
                alt={`${t.title} preview`}
                width={540}
                height={540}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between mt-3 gap-2">
              <a
                href={urls[t.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--text-muted)] hover:underline truncate"
              >
                Open full size ↗
              </a>
              <button
                type="button"
                onClick={() => handleDownload(t.key)}
                disabled={downloading === t.key}
                className="text-sm px-4 py-2 rounded-md text-white font-semibold disabled:opacity-60"
                style={{ background: "#1A6B5A" }}
              >
                {downloading === t.key ? "Downloading…" : "Download PNG"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-6">
        Tip: each image takes a moment to render the first time. Hit
        <span className="font-semibold"> Refresh</span> to pull the latest data.
      </p>
    </div>
  );
}
