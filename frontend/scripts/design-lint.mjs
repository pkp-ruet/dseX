#!/usr/bin/env node
/**
 * design-lint — fails `npm run lint` when a component steps outside the design
 * system (see CLAUDE.md → Theme → Design-system rules).
 *
 * Checks app/, components/, lib/ (.ts/.tsx) for:
 *   - `[var(--x)]` arbitrary colour classes      → use the token utilities (text-text-muted …)
 *   - raw hex colours                             → tokens (OG-image routes exempt)
 *   - Tailwind palette colours (red-500, slate-…) → tokens
 *   - `dark:` variants                            → light-only app
 *   - `text-[…]` font sizes                       → text-xs … text-5xl (12px floor)
 *   - `shadow-[…]` / `rounded-[…]`                → shadow-soft|lift, rounded-sm|md|lg|xl|3xl
 * and app/**\/*.css for raw font-size / border-radius / box-shadow values.
 *
 * Run: node scripts/design-lint.mjs   (exit 1 on findings)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC_DIRS = ["app", "components", "lib"];
const EXEMPT = [/app[\\/]api[\\/]og[\\/]/, /opengraph-image\.tsx$/, /twitter-image\.tsx$/, /manifest\./];

const PALETTE =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";

const TSX_RULES = [
  { name: "arbitrary var() class", re: /\b[a-z-]+-\[var\(--[a-z0-9-]+\)\]/g },
  // themeColor / manifest colours are browser chrome, not UI — they must be literal.
  { name: "raw hex colour", re: /#(?:[0-9a-fA-F]{3}){1,2}\b(?![\w-]*\.(?:svg|png))/g, skipLine: /\/\/|\/\*|https?:|#main|#[a-z][\w-]*"|themeColor|theme_color|background_color/ },
  { name: "Tailwind palette colour", re: new RegExp(`\\b(?:text|bg|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration)-${PALETTE}-\\d{2,3}\\b`, "g") },
  { name: "dark: variant", re: /\bdark:[a-z]/g },
  { name: "arbitrary font size", re: /\btext-\[\d*\.?\d+(?:px|rem|em)\]/g },
  { name: "arbitrary shadow", re: /\bshadow-\[[^\]]+\]/g },
  { name: "arbitrary radius", re: /\brounded(?:-[tblrse]{1,2})?-\[[^\]]+\]/g },
];

// `(?=\S)` pins the lookahead to the first non-space character so `\s*` cannot
// backtrack past it and let a token value through as "raw".
const CSS_RULES = [
  { name: "raw font-size (use var(--fs-*))", re: /font-size:\s*(?=\S)\d*\.?\d+(?:px|rem)\b/g },
  { name: "raw border-radius (use var(--radius*))", re: /border-radius:\s*(?=\S)(?!(?:var\(|999|50%|[0-4]px\b|0\b|inherit))[^;]+;/g },
  { name: "raw box-shadow (use var(--shadow-*))", re: /box-shadow:\s*(?=\S)(?!(?:none|var\(|inset|0 0 0 \d|inherit))[^;]+;/g },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

const findings = [];
for (const d of SRC_DIRS) {
  for (const file of walk(join(ROOT, d))) {
    if (EXEMPT.some((r) => r.test(file))) continue;
    const src = readFileSync(file, "utf8");
    const rules = file.endsWith(".css") ? CSS_RULES : TSX_RULES;
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const rule of rules) {
        if (rule.skipLine && rule.skipLine.test(line)) continue;
        const m = line.match(rule.re);
        if (m) findings.push(`${relative(ROOT, file)}:${i + 1}  ${rule.name}: ${m[0]}`);
      }
    });
  }
}

if (findings.length) {
  console.error(`design-lint: ${findings.length} finding(s)\n`);
  for (const f of findings) console.error("  " + f);
  console.error("\nSee CLAUDE.md → Theme → Design-system rules.");
  process.exit(1);
}
console.log("design-lint: clean");
