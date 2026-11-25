"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconCheck, IconChevronDown, IconCrown } from "@/components/ui/icons";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PlanPicker, { BuyWords } from "@/components/premium/PlanPicker";
import PaySheet from "@/components/premium/PaySheet";
import YourPayments from "@/components/premium/YourPayments";
import PaymentHelp from "@/components/premium/PaymentHelp";
import { useAuth } from "@/context/AuthContext";
import { apiGetMyPayments, getPremiumPlans, type PremiumPayment, type PremiumPlansResponse } from "@/lib/api";
import { FAQS, FEATURES, HERO, SECTIONS, type Bi } from "@/lib/premium-copy";
import { PAID_PLANS, type PlanKey } from "@/lib/premium-plans";
import { trackEvent } from "@/lib/track";

/** One copy pair on screen — the reader sees only their language. */
function Tx({ b }: { b: Bi }) {
  return <T en={b.en} bn={b.bn} />;
}

/**
 * The /premium page body. 2026-11-26 (user: "bring price table to top. after
 * that a simple premium feature list", then the payment-sheet mockup
 * https://claude.ai/artifact/AWU7kotVBn4cDA65Uao1kg → "build it"):
 *   1 the header, the reader's "you came from" note, the two plans and ONE
 *     button (`PlanPicker`, `#pay`);
 *   2 "What you get": a tick, the name and one line per feature, then the
 *     button again for the year;
 *   3 the questions, payment help folded, the reader's past payments.
 * The button opens `PaySheet` (method → send → confirm → done). A guest's
 * sign-up comes back with `?buy=1`, which opens the sheet on arrival.
 *
 * One language per page (2026-10-28): every pair renders through `<T>`. The
 * metadata and FAQ JSON-LD stay in app/premium/page.tsx.
 */
export default function PremiumBody() {
  const { isLoggedIn, isLoading } = useAuth();
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<PremiumPlansResponse | null>(null);
  const [mine, setMine] = useState<PremiumPayment[]>([]);
  const autoOpened = useRef(false);

  // ?plan=quarterly|yearly picks the plan (the renewal alert, sign-in return).
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("plan");
    if (want && PAID_PLANS.some((p) => p.key === want)) setPlan(want as PlanKey);
  }, []);

  useEffect(() => {
    getPremiumPlans()
      .then(setInfo)
      .catch(() => setInfo({ plans: [], methods: [] }));
  }, []);

  const loadMine = useCallback(() => {
    apiGetMyPayments()
      .then((r) => setMine(r.items))
      .catch(() => setMine([]));
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadMine();
    else setMine([]);
  }, [isLoggedIn, loadMine]);

  const pending = mine.find((p) => p.status === "pending") ?? null;
  const guest = !isLoading && !isLoggedIn;
  const closed = !!info && info.methods.length === 0;

  const buy = useCallback(
    (key?: PlanKey) => {
      if (key) setPlan(key);
      trackEvent("premium_pay_open", { plan: key ?? plan, guest: guest ? 1 : 0 });
      setOpen(true);
    },
    [plan, guest],
  );

  // Back from sign-up / sign-in with ?buy=1: open the sheet once, then drop
  // the flag so a reload doesn't open it again.
  useEffect(() => {
    if (autoOpened.current || isLoading || !isLoggedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("buy") !== "1") return;
    autoOpened.current = true;
    params.delete("buy");
    const q = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
    if (!pending) setOpen(true);
  }, [isLoading, isLoggedIn, pending]);

  // Payment help is folded; a link to #payment-help opens it.
  const helpRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const openHelp = () => {
      if (window.location.hash === "#payment-help" && helpRef.current) helpRef.current.open = true;
    };
    openHelp();
    window.addEventListener("hashchange", openHelp);
    return () => window.removeEventListener("hashchange", openHelp);
  }, []);

  return (
    <div className="pm-page">
      {/* 1 · The plans and one button */}
      <section id="pay" className="pm-hero scroll-mt-24" aria-labelledby="pm-h1">
        <PageHeader
          eyebrow={
            <span className="pm-eyebrow">
              <IconCrown size={14} /> <Tx b={HERO.eyebrow} />
            </span>
          }
          title={<span id="pm-h1"><Tx b={HERO.title} /></span>}
          lead={<Tx b={HERO.lead} />}
        />
        <PremiumContextCard />
        <PlanPicker
          plan={plan}
          onPlan={setPlan}
          onBuy={() => buy()}
          guest={guest}
          pending={pending}
          closed={closed}
        />
      </section>

      {/* 2 · What you get */}
      <section aria-labelledby="list-h" id="what" className="pm-section scroll-mt-24">
        <SectionHeader id="list-h" size="lg" title={<Tx b={SECTIONS.list} />} lead={<Tx b={SECTIONS.listNote} />} />
        <ul className="pm-list">
          {FEATURES.map((f) => (
            <li key={f.key} id={`pm-${f.key}`} className="pm-feat">
              <span className="pm-tick" aria-hidden>
                <IconCheck size={14} />
              </span>
              <div className="min-w-0">
                <h3 className="pm-feat-name"><Tx b={f.name} /></h3>
                <p className="pm-feat-line"><Tx b={f.line} /></p>
              </div>
            </li>
          ))}
        </ul>
        {!pending && !closed && (
          <div className="pm-again">
            <Button size="lg" onClick={() => buy("yearly")}>
              <BuyWords plan="yearly" guest={guest} />
            </Button>
            <p className="text-sm text-text-muted"><Tx b={SECTIONS.orQuarter} /></p>
          </div>
        )}
      </section>

      {/* 3 · Questions, payment help folded, past payments */}
      <section aria-labelledby="faq-h" className="pm-section">
        <SectionHeader id="faq-h" size="lg" title={<Tx b={SECTIONS.faq} />} />
        <div className="pm-faq">
          {FAQS.map((f) => (
            <details key={f.q.en} className="pm-faq-item">
              <summary className="pm-fold-summary">
                <span className="min-w-0 font-semibold text-text-main"><Tx b={f.q} /></span>
                <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
              </summary>
              <div className="pm-faq-body">
                <p className="text-sm leading-relaxed text-text-main"><Tx b={f.a} /></p>
              </div>
            </details>
          ))}
        </div>

        <details ref={helpRef} id="payment-help" className="pm-help mt-4 scroll-mt-24">
          <summary className="pm-fold-summary">
            <span className="min-w-0">
              <span className="block font-semibold text-text-main"><Tx b={SECTIONS.help} /></span>
              <span className="mt-1 block text-sm text-text-muted"><Tx b={SECTIONS.helpLead} /></span>
            </span>
            <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
          </summary>
          <div className="pm-help-body">
            <PaymentHelp />
          </div>
        </details>

        <YourPayments items={mine} />
      </section>

      <PaySheet open={open} onClose={() => setOpen(false)} plan={plan} info={info} guest={guest} onPaid={loadMine} />
    </div>
  );
}
