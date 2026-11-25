"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { IconCheck, IconChevron, IconClose, IconInfo } from "@/components/ui/icons";
import { apiSaveSurvey } from "@/lib/api";
import { PAID_PLANS } from "@/lib/premium-plans";
import {
  EXCLUSIVE,
  LABELS,
  PARTS,
  PICK_MAX,
  QUESTION_KEYS,
  SCREENS,
  TEXT_MAX,
  applies,
  deviceFacts,
  isAnswered,
  partOf,
  priceLabel,
  questionHint,
  questionText,
  screenQuestions,
  screenTitle,
  tidy,
  type AnswerValue,
  type Answers,
  type Bi,
  type SurveyState,
} from "@/lib/survey";

/**
 * THE reader survey (2026-11-24): an intro, nine short screens, a thank-you.
 * `popup` = the full-screen overlay `SurveyHost` opens by itself (Later /
 * Don't ask again / ✕); `page` = the same flow on `/feedback`. Answers are
 * saved after every screen (one queue, so saves arrive in order), and the
 * last screen finishes it. Styles: `sv-*` in app/styles/survey.css.
 */

const THANKS = SCREENS + 1;
const CHIP_ONE = new Set(["years", "continue", "next_plan", "spend_amount"]);
const FOLLOW_UPS = new Set(["next_plan", "stay", "spend_amount", "price_high", "like_text", "problem_text"]);
/** Pick several (survey.MANY); the rest pick one. */
const MANY_Q = new Set(["use", "problems", "worth_for", "stay", "back", "spend_on"]);

function Txt({ v }: { v: Bi }) {
  return <T en={v.en} bn={v.bn} />;
}

export default function SurveyFlow({
  state,
  mode,
  onClose,
  fromPath,
}: {
  state: SurveyState;
  mode: "popup" | "page";
  /** popup only: how the reader left (later = ✕ / Later, never, done). */
  onClose?: (how: "later" | "never" | "done") => void;
  fromPath?: string;
}) {
  const { lang, bn } = useLang();
  const { user } = useAuth();
  const seg = state.segment;
  const finished = state.status === "finished";
  const resumable = !finished && Object.keys(state.answers ?? {}).length > 0;

  const [screen, setScreen] = useState<number>(finished && mode === "page" ? THANKS : 0);
  const [answers, setAnswers] = useState<Answers>(() => tidy(state.answers ?? {}));
  const [contact, setContact] = useState<boolean>(state.contact);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);

  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const sentDevice = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  // A new screen starts at its top, with focus on its question.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    headRef.current?.focus({ preventScroll: true });
  }, [screen]);

  const L = (en: string, bnText: string) => (bn ? bnText : en);
  const name = (user?.display_name || "").trim().split(/\s+/)[0] || "";

  /** Save every answer so far (a save lost on a bad connection is made good by
   *  the next one), and clear this screen's answers that were taken back. */
  function save(from: number, extra: { finish?: boolean; contact?: boolean } = {}) {
    const a = tidy(answers);
    const payload: Record<string, AnswerValue | null> = { ...a };
    const qs = from >= 1 && from <= SCREENS ? screenQuestions(from, seg) : [];
    for (const q of qs) payload[q] = a[q] ?? null;
    const body = {
      answers: payload,
      step: Math.min(from, SCREENS),
      lang,
      ...(sentDevice.current ? {} : { device: deviceFacts(), from_path: fromPath }),
      ...extra,
    };
    sentDevice.current = true;
    const run = queue.current.then(() => apiSaveSurvey(body));
    queue.current = run.catch(() => undefined);
    return run;
  }

  function go(to: number) {
    setError("");
    if (screen >= 1 && screen <= SCREENS) save(screen).catch(() => undefined);
    setScreen(to);
  }

  async function finish() {
    setFinishing(true);
    setError("");
    try {
      await save(SCREENS, { finish: true });
      setScreen(THANKS);
    } catch {
      setError(L("We couldn't save your answers. Please try again.", "উত্তর সেভ করা যায়নি। আবার চেষ্টা করুন।"));
    } finally {
      setFinishing(false);
    }
  }

  function setAnswer(qid: string, v: AnswerValue | undefined) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (v === undefined || !isAnswered(v)) delete next[qid];
      else next[qid] = v;
      return tidy(next);
    });
  }

  function toggleMany(qid: string, key: string) {
    const cur = (answers[qid] as string[] | undefined) ?? [];
    const ex = EXCLUSIVE[qid];
    let next: string[];
    if (cur.includes(key)) next = cur.filter((k) => k !== key);
    else if (key === ex) next = [key];
    else next = [...cur.filter((k) => k !== ex), key];
    setAnswer(qid, next);
  }

  function close(how: "later" | "never" | "done") {
    if (screen >= 1 && screen <= SCREENS) save(screen).catch(() => undefined);
    onClose?.(how);
  }

  // Escape = finish later (popup only).
  useEffect(() => {
    if (mode !== "popup") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(screen === THANKS ? "done" : "later");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, screen, answers]);

  const qs = screen >= 1 && screen <= SCREENS ? screenQuestions(screen, seg).filter((q) => applies(q, answers)) : [];
  const answeredHere = qs.some((q) => isAnswered(answers[q]));
  // A screen of only a text box (screen 5): Next works with nothing written.
  const textOnly = qs.length > 0 && qs.every((q) => !QUESTION_KEYS[q]);
  const part = partOf(screen);

  /* ---------------------------------------------------------------- top bar */
  const top = (
    <div className="sv-top">
      {screen >= 1 && screen <= SCREENS ? (
        <button type="button" className="sv-icon-btn" onClick={() => go(screen - 1)} aria-label={L("Back", "পেছনে")}>
          <span className="sv-back"><IconChevron size={20} /></span>
        </button>
      ) : (
        <span className="sv-icon-gap" aria-hidden="true" />
      )}
      {screen >= 1 && screen <= SCREENS ? (
        <div className="sv-prog" aria-hidden="true">
          {PARTS.map((p, i) => {
            const done = i < part ? 1 : i > part ? 0 : (p.screens.indexOf(screen) + 1) / p.screens.length;
            return (
              <span key={i}>
                <i style={{ width: `${Math.round(done * 100)}%` }} />
              </span>
            );
          })}
        </div>
      ) : (
        <span className="sv-brand">
          TopStock<b>BD</b>
        </span>
      )}
      {mode === "popup" ? (
        <button
          type="button"
          className="sv-icon-btn"
          onClick={() => close(screen === THANKS ? "done" : "later")}
          aria-label={screen === THANKS ? L("Close", "বন্ধ করুন") : L("Finish later", "পরে শেষ করব")}
        >
          <IconClose size={20} />
        </button>
      ) : (
        <span className="sv-icon-gap" aria-hidden="true" />
      )}
    </div>
  );

  /* ------------------------------------------------------------------ intro */
  if (screen === 0) {
    return (
      <>
        {top}
        <div className="sv-body" ref={bodyRef}>
          <div className="sv-hero">
            <span className="sv-badge" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.2-4.6A8 8 0 1 1 21 12Z" />
                <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
              </svg>
            </span>
            <h2 className="sv-title" id="sv-heading" ref={headRef} tabIndex={-1}>
              {resumable ? (
                <T en="Pick up where you left off" bn="যেখানে থেমেছিলেন, সেখান থেকে শুরু করুন" />
              ) : (
                <T en="Help us make TopStockBD better for you" bn="TopStockBD-কে আপনার জন্য আরও ভালো করতে একটু সাহায্য করবেন?" />
              )}
            </h2>
            <p className="sv-lead">
              <T
                en="We are a small team. What we build next comes from what readers like you tell us: what helps, what gets in the way, and what is worth paying for."
                bn="আমরা ছোট একটা দল। এরপর কী বানাব, তা ঠিক করি আপনাদের কথা শুনেই: কোনটা কাজে লাগছে, কোথায় আটকে যাচ্ছেন, আর কোনটার জন্য টাকা দিতে রাজি।"
              />
            </p>
            <ul className="sv-ticks">
              <li><IconCheck size={16} /><T en={`About 2 minutes, ${SCREENS} short screens`} bn={`মোটামুটি 2 মিনিট, ${SCREENS}টি ছোট প্রশ্ন`} /></li>
              <li><IconCheck size={16} /><T en="Skip any question you like" bn="যেকোনো প্রশ্ন বাদ দিতে পারেন" /></li>
              <li><IconCheck size={16} /><T en="We read every answer ourselves. Nothing is shown publicly or shared." bn="প্রতিটি উত্তর আমরা নিজেরা পড়ি। কোনো উত্তর প্রকাশ করা বা কারও সঙ্গে শেয়ার করা হয় না।" /></li>
            </ul>
            <div className="sv-actions">
              <Button type="button" variant="primary" size="lg" block onClick={() => go(resumable ? Math.min(Math.max(state.step, 1), SCREENS) : 1)}>
                {resumable ? <T en="Continue" bn="চালিয়ে যাই" /> : <T en="Start" bn="শুরু করি" />}
              </Button>
              {mode === "popup" && (
                <>
                  <Button type="button" variant="quiet" size="lg" block onClick={() => close("later")}>
                    <T en="Later" bn="পরে" />
                  </Button>
                  <button type="button" className="sv-never" onClick={() => close("never")}>
                    <T en="Don't ask me again" bn="আর জিজ্ঞেস করবেন না" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ----------------------------------------------------------------- thanks */
  if (screen === THANKS) {
    const cont = answers.continue as string | undefined;
    const renew = (seg === "ending" || seg === "premium") && (cont === "yes" || cont === "probably");
    // Only a plan still sold (an older answer may name the retired month).
    const plan =
      PAID_PLANS.find((p) => p.key === answers.next_plan) ?? PAID_PLANS.find((p) => p.key === "yearly");
    return (
      <>
        {top}
        <div className="sv-body" ref={bodyRef}>
          <div className="sv-hero">
            <span className="sv-badge sv-badge--ok" aria-hidden="true">
              <IconCheck size={26} />
            </span>
            <h2 className="sv-title" id="sv-heading" ref={headRef} tabIndex={-1}>
              {name ? <T en={`Thank you, ${name}`} bn={`ধন্যবাদ, ${name}`} /> : <T en="Thank you" bn="ধন্যবাদ" />}
            </h2>
            <p className="sv-lead">
              <T
                en="We will read your answers this week. When we change something because of what readers told us, we will let you know."
                bn="এই সপ্তাহেই আপনার উত্তর পড়ব। আপনাদের কথা শুনে কিছু বদলালে আপনাকে জানাব।"
              />
            </p>
            <label className="sv-check" htmlFor="sv-contact">
              <input
                id="sv-contact"
                type="checkbox"
                checked={contact}
                onChange={(e) => {
                  setContact(e.target.checked);
                  save(THANKS, { contact: e.target.checked }).catch(() => undefined);
                }}
              />
              <span>
                <T en="You may contact me about my answers" bn="আমার উত্তর নিয়ে আমার সঙ্গে যোগাযোগ করতে পারেন" />
              </span>
            </label>
            {renew && plan && (
              <div className="sv-renew">
                <span>
                  <T
                    en={`You said you would renew. ${plan.name} is ৳${plan.amount.toLocaleString("en-IN")} and starts after the days you have left.`}
                    bn={`আপনি রিনিউ করবেন বলেছেন। ${plan.bn} ৳${plan.amount.toLocaleString("en-IN")}, বর্তমান মেয়াদ শেষ হওয়ার পর থেকে শুরু হবে।`}
                  />
                </span>
                <Link href={`/premium?plan=${plan.key}&src=survey#pay`} onClick={() => onClose?.("done")}>
                  <T en={`Renew for ${plan.name} ›`} bn={`${plan.bn}-এর জন্য রিনিউ করুন ›`} />
                </Link>
              </div>
            )}
            <div className="sv-actions">
              {mode === "popup" ? (
                <Button type="button" variant="primary" size="lg" block onClick={() => close("done")}>
                  <T en="Back to TopStockBD" bn="TopStockBD-এ ফিরে যাই" />
                </Button>
              ) : (
                <>
                  <Link href="/" className="btn-primary btn-lg btn-block">
                    <T en="Back to TopStockBD" bn="TopStockBD-এ ফিরে যাই" />
                  </Link>
                  <Button type="button" variant="quiet" size="lg" block onClick={() => setScreen(1)}>
                    <T en="Change my answers" bn="উত্তর বদলাতে চাই" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* --------------------------------------------------------------- question */
  const title = screenTitle(screen);
  const last = screen === SCREENS;
  return (
    <>
      {top}
      <div className="sv-body" ref={bodyRef}>
        <p className="sv-part">
          <T
            en={`${PARTS[part].title.en} · ${screen} of ${SCREENS}`}
            bn={`${PARTS[part].title.bn} · ${screen}/${SCREENS}`}
          />
        </p>
        {title && (
          <h2 className="sv-q" id="sv-heading" ref={headRef} tabIndex={-1}>
            <Txt v={title} />
          </h2>
        )}
        {qs.map((qid, i) => (
          <Question
            key={qid}
            qid={qid}
            state={state}
            answers={answers}
            headRef={!title && i === 0 ? headRef : undefined}
            sub={Boolean(title) || (i > 0 && FOLLOW_UPS.has(qid))}
            follow={i > 0 && !title}
            onOne={(v) => setAnswer(qid, answers[qid] === v ? undefined : v)}
            onMany={(k) => toggleMany(qid, k)}
            onText={(t) => setAnswer(qid, t)}
            placeholder={
              qid === "wish_text"
                ? L(
                    "For example: something you can't find, something that confuses you, a feature you miss",
                    "যেমন: যা খুঁজে পান না, যা বুঝতে কষ্ট হয়, বা যে সুবিধাটা চান",
                  )
                : L("Bangla, English or Banglish, whatever is easiest", "বাংলা, ইংরেজি বা বাংলিশ, যেভাবে সহজ")
            }
          />
        ))}
        {screen === 4 && (
          <p className="sv-note">
            <IconInfo size={16} />
            <T
              en="We note your phone or computer and the page you came from, so you don't have to."
              bn="আপনার ফোন বা কম্পিউটার আর কোন পেজ থেকে এসেছেন, তা আমরা নিজেরাই দেখে নিই।"
            />
          </p>
        )}
        {screen === 9 && (
          <p className="sv-note sv-note--box">
            <T en="There is no right answer, and it won't change what you pay." bn="ঠিক-ভুল কোনো উত্তর নেই। এতে আপনার দামও বদলাবে না।" />
          </p>
        )}
        {error && <p className="sv-err" role="alert">{error}</p>}
      </div>
      <div className="sv-foot">
        {textOnly ? (
          <span aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="sv-skip"
            onClick={() => (last ? finish() : go(screen + 1))}
            disabled={finishing}
          >
            <T en="Skip" bn="বাদ দিন" />
          </button>
        )}
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={finishing || (!answeredHere && !last && !textOnly)}
          onClick={() => (last ? finish() : go(screen + 1))}
        >
          {last ? (
            finishing ? <T en="Saving…" bn="সেভ হচ্ছে…" /> : <T en="Finish" bn="শেষ করি" />
          ) : (
            <T en="Next" bn="পরের প্রশ্ন" />
          )}
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ one question */

function Question({
  qid,
  state,
  answers,
  headRef,
  sub,
  follow,
  onOne,
  onMany,
  onText,
  placeholder,
}: {
  qid: string;
  state: SurveyState;
  answers: Answers;
  headRef?: React.Ref<HTMLHeadingElement>;
  /** A smaller heading: a follow-up, or a question under a screen title. */
  sub: boolean;
  /** Under a dashed line: it follows the first question on the screen. */
  follow: boolean;
  onOne: (v: string | number) => void;
  onMany: (k: string) => void;
  onText: (t: string) => void;
  placeholder: string;
}) {
  const text = questionText(qid, state);
  const hint = questionHint(qid);
  const keys = QUESTION_KEYS[qid];
  const id = `sv-q-${qid}`;
  const value = answers[qid];
  const heading = (
    <h3
      className={sub ? "sv-q sv-q--sub" : "sv-q"}
      id={id}
      ref={headRef}
      tabIndex={headRef ? -1 : undefined}
    >
      <Txt v={text} />
    </h3>
  );

  // Free text
  if (!keys) {
    return (
      <div className={follow ? "sv-block sv-follow" : "sv-block"}>
        {qid === "wish_text" ? (
          <>
            {heading}
            {hint && <p className="sv-hint"><Txt v={hint} /></p>}
          </>
        ) : (
          <label className="sv-label" htmlFor={`${id}-box`}>
            <Txt v={text} />{" "}
            <span className="sv-optional"><T en="(optional)" bn="(ইচ্ছে হলে লিখুন)" /></span>
          </label>
        )}
        <textarea
          id={`${id}-box`}
          className="sv-text"
          rows={qid === "wish_text" ? 5 : 3}
          maxLength={TEXT_MAX}
          value={(value as string | undefined) ?? ""}
          placeholder={placeholder}
          onChange={(e) => onText(e.target.value)}
          aria-labelledby={qid === "wish_text" ? id : undefined}
        />
      </div>
    );
  }

  const many = MANY_Q.has(qid);
  const isPrice = qid === "price_good" || qid === "price_high";
  const label = (k: string | number): Bi => (isPrice ? priceLabel(k as number) : LABELS[qid]?.[String(k)] ?? { en: String(k), bn: String(k) });
  const picked = (Array.isArray(value) ? value : []) as string[];
  const atCap = many && qid !== "problems" && qid !== "spend_on" && picked.length >= PICK_MAX;
  const good = typeof answers.price_good === "number" ? answers.price_good : 0;

  return (
    <div className={follow ? "sv-block sv-follow" : "sv-block"}>
      {isPrice ? <p className="sv-label" id={id}><Txt v={text} /></p> : heading}
      {hint && <p className="sv-hint"><Txt v={hint} /></p>}
      {many ? (
        <div className="sv-chips" role="group" aria-labelledby={id}>
          {keys.map((k) => {
            const on = picked.includes(k as string);
            return (
              <button
                key={k}
                type="button"
                className="sv-chip"
                aria-pressed={on}
                disabled={!on && atCap && k !== EXCLUSIVE[qid]}
                onClick={() => onMany(k as string)}
              >
                {on && <IconCheck size={14} />}
                <Txt v={label(k)} />
              </button>
            );
          })}
        </div>
      ) : CHIP_ONE.has(qid) || isPrice ? (
        <div className="sv-chips" role="radiogroup" aria-labelledby={id}>
          {keys.map((k) => {
            const on = value === k;
            const off = qid === "price_high" && typeof k === "number" && k <= good;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                className="sv-chip"
                aria-checked={on}
                disabled={off}
                onClick={() => onOne(k)}
              >
                {on && <IconCheck size={14} />}
                <Txt v={label(k)} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="sv-opts" role="radiogroup" aria-labelledby={id}>
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              className="sv-opt"
              aria-checked={value === k}
              onClick={() => onOne(k)}
            >
              <span className="sv-dot" aria-hidden="true" />
              <span><Txt v={label(k)} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
