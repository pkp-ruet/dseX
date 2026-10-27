import Link from "next/link";
import { taka, pct, formatDate, crore } from "@/lib/formatters";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { bnDate, croreBn } from "@/lib/bn";

export interface MarketMoverItem {
  trading_code: string;
  company_name: string | null;
  ltp: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
}

export interface MarketMoversData {
  date: string | null;
  gainers: MarketMoverItem[];
  losers: MarketMoverItem[];
  most_traded: MarketMoverItem[];
}

function MoverRow({
  item,
  metric,
}: {
  item: MarketMoverItem;
  metric: "change" | "value";
}) {
  const changePct = item.change_pct;
  const isPositive = (changePct ?? 0) >= 0;
  const changeColor = isPositive ? "var(--positive)" : "var(--negative)";

  return (
    <Link prefetch={false} href={`/stock/${item.trading_code}`} className="info-col-row--intel">
      <span className="icr-key">{item.trading_code}</span>
      <span className="icr-sub min-w-0 truncate">
        {item.ltp != null ? taka(item.ltp) : "—"}
      </span>
      <span className="icr-val" style={{ color: metric === "change" ? changeColor : undefined }}>
        {metric === "change"
          ? changePct != null
            ? `${changePct >= 0 ? "+" : ""}${pct(changePct)}`
            : "—"
          : item.value_mn != null
            ? <T en={crore(item.value_mn)} bn={croreBn(item.value_mn)} />
            : "—"}
      </span>
    </Link>
  );
}

export default function MarketMovers({ data, compact }: { data: MarketMoversData; compact?: boolean }) {
  const hasData =
    data.gainers.length > 0 ||
    data.losers.length > 0 ||
    data.most_traded.length > 0;

  if (!hasData) return null;

  const dateEn = data.date ? formatDate(data.date) : "latest";
  const dateBn = data.date ? bnDate(data.date) : "সর্বশেষ";

  return (
    <>
      <SectionHeader
        title={<T en={`Biggest moves · ${dateEn}`} bn={`সবচেয়ে বড় ওঠানামা · ${dateBn}`} />}
        className="mt-8"
      />

      <div className={compact ? "movers-strip movers-strip--compact" : "movers-strip"}>
        <div className="info-col info-col--gainers">
          <h2 className="info-col-header">
            <T en="Rose most today" bn="আজ সবচেয়ে বেশি বেড়েছে" />
          </h2>
          {data.gainers.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="change" />
          ))}
        </div>
        <div className="info-col info-col--losers">
          <h2 className="info-col-header">
            <T en="Fell most today" bn="আজ সবচেয়ে বেশি কমেছে" />
          </h2>
          {data.losers.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="change" />
          ))}
        </div>
        <div className="info-col info-col--traded">
          <h2 className="info-col-header">
            <T en="Most traded today" bn="আজ সবচেয়ে বেশি লেনদেন" />
          </h2>
          {data.most_traded.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="value" />
          ))}
        </div>
      </div>
    </>
  );
}
