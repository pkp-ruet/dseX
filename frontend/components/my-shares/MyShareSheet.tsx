"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import FeedRow, { itemRowProps, type FeedTone } from "@/components/feed/FeedRow";
import { changePct, changeTone, money } from "@/lib/formatters";
import { whenWords, type UpdateTone } from "@/lib/watch-updates";
import { ruleLabel } from "@/lib/watch-rules";
import { activeAlertFor, subscribeAlerts } from "@/lib/price-alerts";
import {
  getWatchRulesState,
  loadWatchRules,
  openWatchRules,
  subscribeWatchRules,
} from "@/components/watch-rules/store";
import type { MyShare } from "@/lib/my-shares";

const TONE: Record<UpdateTone, FeedTone> = { positive: "good", negative: "bad", watch: "watch", primary: "info", muted: "neutral" };

/**
 * One share on My shares, opened (2026-11-25): the same sheet for a share the
 * reader owns and one they watch. Today's price and where it sits this year,
 * what's new (the Updates feed's own rows, 30 days), the dates ahead, what we
 * tell them about it (their watch rules and price alert, changed in the Watch
 * sheet), then our analysis. Only the last line differs: an owned share points
 * to the portfolio for buying and selling, a watched one can be marked as
 * owned or stopped watching.
 */
export default function MyShareSheet({
  share,
  open,
  premium,
  range,
  onClose,
  onStop,
}: {
  share: MyShare | null;
  open: boolean;
  /** The feed shows every update (Premium or the 7-day taste). */
  premium: boolean;
  range: { hi: number | null; lo: number | null } | null;
  onClose: () => void;
  onStop: (code: string) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    loadWatchRules().then(() => setTick((n) => n + 1));
    const offR = subscribeWatchRules(() => setTick((n) => n + 1));
    const offA = subscribeAlerts(() => setTick((n) => n + 1));
    return () => {
      offR();
      offA();
    };
  }, []);

  if (!share) return null;
  const { code, name } = share;
  const rules = (getWatchRulesState()?.rules ?? []).filter((r) => r.code === code);
  const alert = activeAlertFor(code);
  const pos =
    share.ltp != null && range?.hi != null && range.lo != null && range.hi > range.lo
      ? Math.max(0, Math.min(1, (share.ltp - range.lo) / (range.hi - range.lo)))
      : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={name}
      subtitle={
        <>
          {code} · {share.owned ? <T en="You own it" bn="আপনার আছে" /> : <T en="You watch it" bn="নজরে রাখছেন" />}
        </>
      }
      footer={
        <div className="pfs-acts">
          <Button href={`/stock/${code}#ch-analysis`} variant="primary">
            <T en="Read our analysis" bn="আমাদের বিশ্লেষণ পড়ুন" />
          </Button>
          {share.owned ? (
            <Button href={`/portfolio?share=${encodeURIComponent(code)}`} variant="quiet">
              <T en="Buy or sell" bn="কিনুন বা বেচুন" />
            </Button>
          ) : (
            <Button href={`/portfolio?add=${encodeURIComponent(code)}`} variant="quiet">
              <T en="I own it" bn="এটি আমার আছে" />
            </Button>
          )}
        </div>
      }
    >
      <div className="pfs">
        <div>
          <p className="my-sh-price">
            <b>{money(share.ltp)}</b>
            <span className={changeTone(share.change)}>
              {changePct(share.change)} <T en="today" bn="আজ" />
            </span>
          </p>
          {pos != null && (
            <div className="my-sh-range">
              <div className="pf-range" aria-hidden>
                <i style={{ left: `${(pos * 100).toFixed(1)}%` }} />
              </div>
              <div className="pf-range-ends">
                <span>
                  <T en="Year low" bn="বছরের সর্বনিম্ন" /> {money(range!.lo)}
                </span>
                <span>
                  <T en="Year high" bn="বছরের সর্বোচ্চ" /> {money(range!.hi)}
                </span>
              </div>
            </div>
          )}
        </div>

        <section>
          <h3 className="pfs-k">
            <T en="What's new" bn="নতুন কী" />
          </h3>
          {share.news.length > 0 ? (
            <ul className="nt-list pfs-feed">
              {share.news.map((i) => (
                <FeedRow key={i.id} href={i.url} {...itemRowProps(i, "day")} />
              ))}
            </ul>
          ) : premium ? (
            <p className="pfs-p">
              <T
                en="Nothing new in the last 30 days. Results, dividends and warnings show here the day they come."
                bn="গত 30 দিনে নতুন কিছু নেই। আর্থিক ফল, ডিভিডেন্ড আর সতর্কতা এলে সেদিনই এখানে দেখাবে।"
              />
            </p>
          ) : (
            <p className="pfs-p">
              <T
                en="Nothing here that a free account sees. With Premium you see every update on your shares the day it comes."
                bn="ফ্রি অ্যাকাউন্টে দেখা যায় এমন কিছু এখানে নেই। প্রিমিয়ামে আপনার শেয়ারের প্রতিটি খবর সেদিনই দেখবেন।"
              />
            </p>
          )}
        </section>

        <section>
          <h3 className="pfs-k">
            <T en="Coming up" bn="সামনে যা আছে" />
          </h3>
          {share.coming.length > 0 ? (
            <ul className="nt-list pfs-feed">
              {share.coming.map((u) => (
                <FeedRow
                  key={u.id}
                  href={u.href}
                  kind={u.label}
                  tone={TONE[u.tone]}
                  when={whenWords(u)}
                  title={u.title}
                  body={u.line ?? null}
                />
              ))}
            </ul>
          ) : (
            <p className="pfs-p">
              <T
                en="No results date, record date or AGM ahead yet."
                bn="সামনে এখনো কোনো ফলের তারিখ, রেকর্ড ডেট বা এজিএম নেই।"
              />
            </p>
          )}
        </section>

        <section>
          <h3 className="pfs-k">
            <T en="What we tell you about it" bn="এ নিয়ে আমরা যা জানাই" />
          </h3>
          {rules.length > 0 || alert ? (
            <ul className="my-rules">
              {rules.map((r) => {
                const l = ruleLabel(r.kind, r.value);
                return (
                  <li key={r.kind} className="my-rule" data-paused={r.paused || undefined}>
                    <T en={l.en} bn={l.bn} />
                    {r.paused && <T en=" (paused)" bn=" (বন্ধ আছে)" />}
                  </li>
                );
              })}
              {alert && (
                <li className="my-rule">
                  <T en={`Its price reaches ${money(alert.target_price)}`} bn={`দাম ${money(alert.target_price)} হলে`} />
                </li>
              )}
            </ul>
          ) : (
            <p className="pfs-p">
              <T en="Nothing chosen yet." bn="এখনো কিছু বেছে নেননি।" />
            </p>
          )}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => openWatchRules(code, name, { ltp: share.ltp })}
          >
            {rules.length > 0 || alert ? (
              <T en="Change what we tell you" bn="কী জানাব, বদলান" />
            ) : (
              <T en="Choose what we tell you" bn="কী জানাব, বেছে নিন" />
            )}
          </Button>
        </section>

        {share.owned ? (
          <p className="pfs-p my-sh-own">
            <T
              en={`You own ${share.qty.toLocaleString("en-IN")} ${share.qty === 1 ? "share" : "shares"}. Buying, selling and your profit are on your portfolio.`}
              bn={`আপনার ${share.qty.toLocaleString("en-IN")}টি শেয়ার আছে। কেনা, বেচা আর আপনার লাভ পোর্টফোলিওতে।`}
            />
          </p>
        ) : (
          <div>
            <Button type="button" variant="link" size="sm" className="my-sh-stop" onClick={() => onStop(code)}>
              <T en="Stop watching" bn="নজর রাখা বন্ধ করুন" />
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
