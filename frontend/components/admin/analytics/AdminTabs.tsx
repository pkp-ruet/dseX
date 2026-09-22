"use client";

export type TabKey = "pulse" | "behavior" | "retention" | "growth" | "features" | "users";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pulse", label: "Pulse" },
  { key: "behavior", label: "Behavior" },
  { key: "retention", label: "Retention" },
  { key: "growth", label: "Growth" },
  { key: "features", label: "Features" },
  { key: "users", label: "Users" },
];

export default function AdminTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === t.key
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
