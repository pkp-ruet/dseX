import type { Block, L } from "./types";

/** Short builders so a lesson file reads like the lesson. Every pair is (English, Bengali). */
export const l = (en: string, bn: string): L => ({ en, bn });
export const p = (en: string, bn: string): Block => ({ kind: "p", text: l(en, bn) });
export const tip = (en: string, bn: string): Block => ({ kind: "tip", text: l(en, bn) });
export const warn = (en: string, bn: string): Block => ({ kind: "warn", text: l(en, bn) });
export const list = (...items: [string, string][]): Block => ({ kind: "list", items: items.map(([en, bn]) => l(en, bn)) });
export const steps = (...items: ([string, string] | [string, string, string, string])[]): Block => ({
  kind: "steps",
  items: items.map((x) => (x.length === 4 ? { title: l(x[0], x[1]), text: l(x[2], x[3]) } : { title: l(x[0], x[1]) })),
});
export const flow = (items: [string, string][], caption?: [string, string]): Block => ({
  kind: "flow",
  items: items.map(([en, bn]) => l(en, bn)),
  caption: caption ? l(caption[0], caption[1]) : undefined,
});
