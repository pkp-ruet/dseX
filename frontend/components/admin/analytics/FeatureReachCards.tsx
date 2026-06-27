"use client";

import type { AdminFeatureReach } from "@/lib/api";
import Card from "@/components/ui/Card";
import { COLORS } from "./shared";

/** Human "60 iOS · 28 Android · 4 desktop" from the platform breakdown. */
function platformLabel(platforms: Record<string, number>): string {
  const parts: string[] = [];
  if (platforms.ios) parts.push(`${platforms.ios} iOS`);
  if (platforms.android) parts.push(`${platforms.android} Android`);
  if (platforms.desktop) parts.push(`${platforms.desktop} desktop`);
  const other = Object.entries(platforms)
    .filter(([k]) => !["ios", "android", "desktop"].includes(k))
    .reduce((sum, [, v]) => sum + v, 0);
  if (other) parts.push(`${other} other`);
  return parts.length ? parts.join(" · ") : "no installs yet";
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export default function FeatureReachCards({ data }: { data: AdminFeatureReach }) {
  const total = data.total_users || 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const cards = [
    {
      key: "push",
      icon: "🔔",
      label: "Push enabled",
      users: data.push.users,
      secondary: `${data.push.devices.toLocaleString()} ${plural(data.push.devices, "device")} registered`,
      color: COLORS.primary,
    },
    {
      key: "install",
      icon: "📲",
      label: "Installed app",
      users: data.install.users,
      secondary: platformLabel(data.install.platforms || {}),
      color: COLORS.indigo,
    },
    {
      key: "alerts",
      icon: "⏰",
      label: "Price alerts",
      users: data.alerts.users,
      secondary: `${data.alerts.active.toLocaleString()} active ${plural(data.alerts.active, "alert")}`,
      color: COLORS.orange,
    },
    {
      key: "ai",
      icon: "🤖",
      label: "TopStock AI",
      users: data.ai.users,
      secondary: `${data.ai.messages.toLocaleString()} ${plural(data.ai.messages, "message")} sent`,
      color: COLORS.positive,
    },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-[var(--text)]">Power features</h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          % of {total.toLocaleString()} registered users
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const p = pct(c.users);
          return (
            <Card key={c.key} padding="none" className="rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base leading-none">{c.icon}</span>
                <span className="text-xs font-semibold text-[var(--text)]">{c.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums nums" style={{ color: c.color }}>
                {c.users.toLocaleString()}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">{p}% of users</p>
              <span className="mt-2 block h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${p}%`, background: c.color }}
                />
              </span>
              <p className="mt-2 text-[11px] text-[var(--text-muted)] truncate" title={c.secondary}>
                {c.secondary}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
