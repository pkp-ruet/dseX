"use client";

import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import type { SavedCustomList } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

/**
 * One saved list: its checks in words, how many companies pass today, who
 * joined or left at the last daily check, the top three, and its controls.
 */
export default function SavedListCard({
  list, bn, canEdit, onEdit, onToggleAlerts, onDelete,
}: {
  list: SavedCustomList;
  bn: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onToggleAlerts: () => void;
  onDelete: () => void;
}) {
  const t = (en: string, b: string) => (bn ? b : en);
  const names = (xs: { code: string }[]) => xs.map((x) => x.code).join(", ");

  return (
    <Card padding="none" className="overflow-hidden" id={`list-${list.id}`}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-bold text-text-main">{list.name}</h3>
          {list.passed != null && (
            <span className="text-sm text-text-muted tabular-nums">
              {t(`${list.passed} pass today`, `আজ ${list.passed}টি পাস`)}
            </span>
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {list.summary.map((s) => (
            <li key={s.key}><Chip>{t(s.en, s.bn)}</Chip></li>
          ))}
        </ul>
        {list.broken && (
          <p className="mt-3 text-sm text-negative">
            {t("One of its checks no longer works (a sector changed). Edit the list to fix it.",
               "এর একটি শর্ত আর কাজ করছে না (খাত বদলেছে)। ঠিক করতে তালিকাটি বদলান।")}
          </p>
        )}
        {(list.joined.length > 0 || list.left.length > 0) && list.changed_on && (
          <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
            <p className="text-xs text-text-muted">{t(`Changed on ${formatDate(list.changed_on)}`, `${formatDate(list.changed_on)}-এ বদলেছে`)}</p>
            {list.joined.length > 0 && (
              <p className="mt-1 text-text-main">
                <span className="font-semibold text-positive">{t("Joined", "যোগ হয়েছে")}:</span> {names(list.joined)}
              </p>
            )}
            {list.left.length > 0 && (
              <p className="mt-0.5 text-text-main">
                <span className="font-semibold text-negative">{t("Left", "বাদ পড়েছে")}:</span> {names(list.left)}
              </p>
            )}
          </div>
        )}
      </div>
      {list.top && list.top.length > 0 && (
        <ul className="border-t border-border">
          {list.top.map((s) => (
            <StockRow
              key={s.code}
              as="li"
              inset="card"
              code={s.code}
              name={s.name}
              price={s.price}
              change={s.change_pct}
              trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
              lang={bn ? "bn" : "en"}
            />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3 sm:px-5">
        {canEdit && (
          <>
            <Button variant="quiet" size="sm" onClick={onEdit}>{t("Open and edit", "খুলুন ও বদলান")}</Button>
            <Chip active={list.alerts} onClick={onToggleAlerts}>
              {list.alerts ? t("Daily alert on", "দৈনিক অ্যালার্ট চালু") : t("Daily alert off", "দৈনিক অ্যালার্ট বন্ধ")}
            </Chip>
          </>
        )}
        <Button variant="link" size="sm" onClick={onDelete} className="ml-auto">{t("Delete", "মুছুন")}</Button>
      </div>
    </Card>
  );
}
