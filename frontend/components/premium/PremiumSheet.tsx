"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import { IconCrown, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { PremiumCtaWords, PremiumFine, PremiumPrice, usePremiumHref } from "@/components/premium/PremiumCard";

type Bi = { en: string; bn: string };

/**
 * One way to show Premium (2026-11-25, step 5 of the "One job, one place"
 * review, idea 6; first on the dividend calendar). A page no longer carries a
 * Premium card: anything locked shows a small gold lock where it would be
 * (`GoldLock`, `LockRow`), and every lock opens the SAME sheet. The sheet says
 * what this lock opens, then the page's pitch (what the card used to say),
 * the price and one button.
 *
 * A page wraps its locked part in `PremiumSheetScope` with its `pitch`; the
 * scope is the page's Premium anchor (`id`), fires `premium_lock_view` once
 * when it scrolls into view, `premium_sheet_open` on every lock tap, and
 * `premium_lock_tap` on the sheet's button (all with `card: "sheet"`).
 */

/** What a page says about its Premium, once, in the sheet. */
export type PremiumPitch = {
  /** GA area ("dividend-calendar") and the `src` on the /premium link. */
  area: string;
  src: string;
  /** What this Premium is: "Dividend calendar". */
  tag: Bi;
  title: Bi;
  lead?: Bi;
  /** The page's own body: `PremiumTicks`, a count. */
  body?: ReactNode;
  /** The button's words when the reader has no offer. */
  cta: Bi;
  /** What /premium shows as "you came from". */
  context: { label: Bi; stakes: Bi[] };
  /** Extra GA params (variant, counts). */
  track?: Record<string, string | number>;
  /** One extra line in the fine print. */
  fine?: Bi;
};

/** One lock: a key for GA and what it opens, in one sentence. */
export type LockInfo = { key: string; what: Bi };

const Ctx = createContext<((lock: LockInfo) => void) | null>(null);

/** Opens the page's Premium sheet; null outside a scope. */
export function usePremiumSheet(): ((lock: LockInfo) => void) | null {
  return useContext(Ctx);
}

export function PremiumSheetScope({
  pitch,
  anchor,
  className = "",
  children,
}: {
  pitch: PremiumPitch;
  /** The page's Premium anchor: links to `#<anchor>` land here. */
  anchor: string;
  className?: string;
  children: ReactNode;
}) {
  const { state } = usePremium();
  const [lock, setLock] = useState<LockInfo | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const params = JSON.stringify(pitch.track ?? {});
  const area = pitch.area;

  // Seen = the locked part reached the upper part of the screen once.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock: `${area}-locks`, state, card: "sheet", ...JSON.parse(params) });
        io.disconnect();
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [area, state, params]);

  const open = useCallback(
    (l: LockInfo) => {
      trackEvent("premium_sheet_open", { area, lock: l.key, state, card: "sheet", ...JSON.parse(params) });
      setLock(l);
    },
    [area, state, params],
  );

  return (
    <Ctx.Provider value={open}>
      <div ref={ref} id={anchor} className={`scroll-mt-24 ${className}`.trim()}>
        {children}
      </div>
      <PremiumSheet pitch={pitch} lock={lock} onClose={() => setLock(null)} />
    </Ctx.Provider>
  );
}

/** THE Premium sheet: what this lock opens, the page's pitch, price, one button. */
function PremiumSheet({ pitch, lock, onClose }: { pitch: PremiumPitch; lock: LockInfo | null; onClose: () => void }) {
  const { state } = usePremium();
  const { bn } = useLang();
  const href = usePremiumHref(pitch.src);
  const shown = lock;

  const onTap = () => {
    if (!shown) return;
    trackEvent("premium_lock_tap", {
      area: pitch.area,
      lock: shown.key,
      state,
      card: "sheet",
      ...(pitch.track ?? {}),
    });
    savePremiumContext({
      from: shown.key,
      label: bn ? pitch.context.label.bn : pitch.context.label.en,
      stakes: [shown.what, ...pitch.context.stakes].slice(0, 3).map((s) => (bn ? s.bn : s.en)),
    });
  };

  return (
    <Sheet
      open={lock != null}
      onClose={onClose}
      title={<T en={pitch.title.en} bn={pitch.title.bn} />}
      subtitle={
        <span className="psh-tag">
          <IconCrown size={14} />
          <T en={`Premium · ${pitch.tag.en}`} bn={`প্রিমিয়াম · ${pitch.tag.bn}`} />
        </span>
      }
      footer={
        <div className="psh-foot">
          <div className="psh-price">
            <PremiumPrice />
          </div>
          <Button href={href} onClick={onTap} size="lg" block>
            <PremiumCtaWords cta={pitch.cta} />
          </Button>
        </div>
      }
    >
      {shown && (
        <p className="psh-what">
          <span className="psh-what-icon" aria-hidden="true">
            <IconLock size={16} />
          </span>
          <span className="min-w-0">
            <span className="psh-what-k">
              <T en="This lock opens" bn="এই তালায় যা আছে" />
            </span>
            <T en={shown.what.en} bn={shown.what.bn} />
          </span>
        </p>
      )}
      {pitch.lead && (
        <p className="psh-lead">
          <T en={pitch.lead.en} bn={pitch.lead.bn} />
        </p>
      )}
      {pitch.body && <div className="psh-body">{pitch.body}</div>}
      <p className="psh-fine">
        <PremiumFine fine={pitch.fine} />
      </p>
    </Sheet>
  );
}

/** The gold lock, where a locked thing would be. Outside a scope it is a
 *  plain link to /premium. `label` adds words beside it ("See which"). */
export function GoldLock({ lock, label, className = "" }: { lock: LockInfo; label?: Bi; className?: string }) {
  const open = usePremiumSheet();
  const { bn } = useLang();
  const aria = bn ? `প্রিমিয়াম: ${lock.what.bn}` : `Premium: ${lock.what.en}`;
  const inner = (
    <>
      <IconLock size={label ? 14 : 16} />
      {label && <T en={label.en} bn={label.bn} />}
    </>
  );
  const cls = `glock ${label ? "glock--label" : ""} ${className}`.trim();
  if (!open) {
    return (
      <Link href={PREMIUM_PATH} className={cls} aria-label={label ? undefined : aria}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} aria-label={label ? undefined : aria} onClick={() => open(lock)}>
      {inner}
    </button>
  );
}

/** A whole locked row as one button: the row's own parts (a masked name, a
 *  date), and the gold lock where its figure would be. */
export function LockRow({ lock, children, className = "" }: { lock: LockInfo; children: ReactNode; className?: string }) {
  const open = usePremiumSheet();
  const { bn } = useLang();
  const aria = bn ? `প্রিমিয়াম: ${lock.what.bn}` : `Premium: ${lock.what.en}`;
  const body = (
    <>
      <span className="lkr-main">{children}</span>
      <span className="glock" aria-hidden="true">
        <IconLock size={16} />
      </span>
    </>
  );
  if (!open) {
    return (
      <Link href={PREMIUM_PATH} className={`lkr ${className}`.trim()} aria-label={aria}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={`lkr ${className}`.trim()} aria-label={aria} onClick={() => open(lock)}>
      {body}
    </button>
  );
}
