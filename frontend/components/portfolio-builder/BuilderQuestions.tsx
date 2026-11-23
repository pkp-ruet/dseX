"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconCheck, IconRedo } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import {
  AMOUNT_CHIPS,
  DEFAULT_ANSWERS,
  HORIZONS,
  HORIZON_WORDS,
  LEAVE_OUT,
  LEAVE_WORDS,
  LIKES,
  LIKE_WORDS,
  MAX_AMOUNT,
  MAX_LIKES,
  MIN_AMOUNT,
  PURPOSES,
  PURPOSE_WORDS,
  shareCount,
  taka,
  type BuilderAnswers,
  type LeaveOut,
  type Like,
} from "@/lib/portfolio-builder";

/**
 * The three questions (2026-11-23). On phones one step at a time with a
 * progress bar; from 900px all three side by side on one card with one
 * button. Every question already has an answer, so "Build my portfolio"
 * works at once. When building again the last answers come filled in.
 */
export default function BuilderQuestions({
  answers,
  onChange,
  onBuild,
  building,
  again,
  onCancel,
  held,
}: {
  answers: BuilderAnswers;
  onChange: (a: BuilderAnswers) => void;
  onBuild: (a: BuilderAnswers) => void;
  building: boolean;
  /** Building again: the last answers are filled in. */
  again: boolean;
  /** Back to the plan without building (only when there is one). */
  onCancel?: () => void;
  /** The reader's main portfolio today (phase 2: "Add to my shares"), or null. */
  held?: { count: number; value: number } | null;
}) {
  const mine = answers.start === "mine" && !!held;
  const { bn } = useLang();
  const [step, setStep] = useState(0);
  const [amountText, setAmountText] = useState(String(answers.amount));
  const amount = Number(amountText.replace(/[^0-9]/g, "")) || 0;
  const amountBad = amount < MIN_AMOUNT || amount > MAX_AMOUNT;

  const set = (patch: Partial<BuilderAnswers>) => onChange({ ...answers, ...patch });
  const setAmount = (v: number) => {
    setAmountText(String(v));
    set({ amount: v });
  };
  const toggleLike = (k: Like) => {
    const has = answers.likes.includes(k);
    if (!has && answers.likes.length >= MAX_LIKES) return;
    set({ likes: has ? answers.likes.filter((x) => x !== k) : [...answers.likes, k] });
  };
  const toggleLeave = (k: LeaveOut) => {
    const has = answers.leave_out.includes(k);
    set({ leave_out: has ? answers.leave_out.filter((x) => x !== k) : [...answers.leave_out, k] });
  };
  const build = () => {
    if (amountBad) {
      setStep(0);
      return;
    }
    onBuild({ ...answers, amount });
  };
  const clear = () => {
    setAmountText(String(DEFAULT_ANSWERS.amount));
    onChange({ ...DEFAULT_ANSWERS, start: held ? "mine" : "fresh" });
    setStep(0);
  };

  return (
    <section className="pbq" aria-labelledby="pbq-title" data-step={step}>
      <h2 id="pbq-title" className="sr-only">
        <T en="Your answers" bn="আপনার উত্তর" />
      </h2>

      {again && (
        <p className="pbq-again">
          <IconRedo size={16} />
          <span>
            <T en="Building again. Your last answers are filled in. " bn="আবার বানাচ্ছেন। আগের উত্তরগুলো দেওয়া আছে। " />
            <button type="button" className="pbq-link" onClick={clear}>
              <T en="Clear them" bn="মুছে দিন" />
            </button>
          </span>
        </p>
      )}

      <div className="pbq-prog" aria-hidden="true">
        <span>
          <T en={`Step ${step + 1} of 3`} bn={`ধাপ ${step + 1} / 3`} />
        </span>
        <span className="pbq-bars">
          {[0, 1, 2].map((i) => (
            <i key={i} data-on={i <= step ? "1" : undefined} />
          ))}
        </span>
      </div>

      <div className="pbq-grid">
        {/* 1 · How much */}
        <fieldset className="pbq-step" data-active={step === 0 ? "1" : undefined}>
          <legend className="pbq-q">
            <span className="pbq-n">1</span>
            {mine ? (
              <T en="How much new money do you want to add?" bn="কত নতুন টাকা যোগ করতে চান?" />
            ) : (
              <T en="How much do you want to invest?" bn="কত টাকা বিনিয়োগ করতে চান?" />
            )}
          </legend>
          {held && (
            <div className="pbq-opts pbq-start" role="radiogroup" aria-label={bn ? "কোথা থেকে শুরু" : "Start from"}>
              <button
                type="button"
                role="radio"
                aria-checked={answers.start === "mine"}
                className="pbq-opt"
                onClick={() => set({ start: "mine" })}
              >
                <span className="pbq-radio" aria-hidden="true" />
                <span className="min-w-0">
                  <b>
                    <T en="Add to my shares" bn="আমার শেয়ারে যোগ করুন" />
                  </b>
                  <span>
                    <T
                      en={`Your ${held.count} shares, worth ${taka(held.value)} today. No share or business gets too big.`}
                      bn={`আপনার ${held.count}টি শেয়ার, আজ মূল্য ${taka(held.value)}। কোনো শেয়ার বা ব্যবসা বেশি বড় হবে না।`}
                    />
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={answers.start === "fresh"}
                className="pbq-opt"
                onClick={() => set({ start: "fresh" })}
              >
                <span className="pbq-radio" aria-hidden="true" />
                <span className="min-w-0">
                  <b>
                    <T en="New money on its own" bn="শুধু নতুন টাকা দিয়ে" />
                  </b>
                  <span>
                    <T en="A separate portfolio for this money." bn="এই টাকার জন্য আলাদা পোর্টফোলিও।" />
                  </span>
                </span>
              </button>
            </div>
          )}
          <label htmlFor="pb-amount" className="sr-only">
            <T en="Amount in taka" bn="টাকার পরিমাণ" />
          </label>
          <div className="pbq-amount" data-bad={amountBad ? "1" : undefined}>
            <span aria-hidden="true">৳</span>
            <input
              id="pb-amount"
              inputMode="numeric"
              autoComplete="off"
              value={amount ? amount.toLocaleString("en-IN") : amountText}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
                setAmountText(digits);
                const v = Number(digits) || 0;
                set({ amount: v });
              }}
            />
          </div>
          <div className="pbq-chips" role="group" aria-label={bn ? "দ্রুত পরিমাণ" : "Quick amounts"}>
            {AMOUNT_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="pbq-chip"
                aria-pressed={amount === c.value}
                onClick={() => setAmount(c.value)}
              >
                <T en={c.label.en} bn={c.label.bn} />
              </button>
            ))}
          </div>
          {amountBad ? (
            <p className="form-error">
              <T
                en={amount < MIN_AMOUNT ? "Start from ৳10,000." : "Up to ৳10 crore."}
                bn={amount < MIN_AMOUNT ? "৳10,000 থেকে শুরু করুন।" : "সর্বোচ্চ ৳10 কোটি।"}
              />
            </p>
          ) : (
            <p className="pbq-sub">
              {mine ? (
                <T
                  en={`Your portfolio would be ${taka(held!.value + amount)} in all.`}
                  bn={`সব মিলিয়ে আপনার পোর্টফোলিও হবে ${taka(held!.value + amount)}।`}
                />
              ) : (
                <T
                  en={`With ${taka(amount)} we pick ${shareCount(amount)} shares.`}
                  bn={`${taka(amount)} দিয়ে আমরা ${shareCount(amount)}টি শেয়ার বাছাই করি।`}
                />
              )}
            </p>
          )}
          <p className="pbq-note">
            <T
              en="Put in only money you won't need for the next 2 to 3 years."
              bn="শুধু সেই টাকা দিন, যা আগামী 2–3 বছর লাগবে না।"
            />
          </p>
        </fieldset>

        {/* 2 · What it's for */}
        <fieldset className="pbq-step" data-active={step === 1 ? "1" : undefined}>
          <legend className="pbq-q">
            <span className="pbq-n">2</span>
            <T en="What is this money for?" bn="এই টাকা দিয়ে কী চান?" />
          </legend>
          <div className="pbq-opts" role="radiogroup" aria-label={bn ? "লক্ষ্য" : "Purpose"}>
            {PURPOSES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={answers.purpose === p}
                className="pbq-opt"
                onClick={() => set({ purpose: p })}
              >
                <span className="pbq-radio" aria-hidden="true" />
                <span className="min-w-0">
                  <b>
                    <T en={PURPOSE_WORDS[p].name.en} bn={PURPOSE_WORDS[p].name.bn} />
                  </b>
                  <span>
                    <T en={PURPOSE_WORDS[p].line.en} bn={PURPOSE_WORDS[p].line.bn} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="pbq-label" id="pbq-when">
            <T en="When might you need this money?" bn="টাকাটা কবে লাগতে পারে?" />
          </p>
          <div className="pbq-chips" role="radiogroup" aria-labelledby="pbq-when">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={answers.horizon === h}
                className="pbq-chip"
                onClick={() => set({ horizon: h })}
              >
                <T en={HORIZON_WORDS[h].en} bn={HORIZON_WORDS[h].bn} />
              </button>
            ))}
          </div>
        </fieldset>

        {/* 3 · What kind of company */}
        <fieldset className="pbq-step" data-active={step === 2 ? "1" : undefined}>
          <legend className="pbq-q">
            <span className="pbq-n">3</span>
            <T en="What kind of companies do you want?" bn="কেমন কোম্পানি চান?" />
          </legend>
          <p className="pbq-sub">
            <T en="Pick up to 2, or none." bn="সর্বোচ্চ 2টি বেছে নিন, না নিলেও চলবে।" />
          </p>
          <div className="pbq-chips" role="group" aria-label={bn ? "কেমন কোম্পানি" : "Kind of company"}>
            {LIKES.map((k) => {
              const on = answers.likes.includes(k);
              const full = !on && answers.likes.length >= MAX_LIKES;
              return (
                <button
                  key={k}
                  type="button"
                  className="pbq-chip"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggleLike(k)}
                >
                  {on && <IconCheck size={14} />}
                  <T en={LIKE_WORDS[k].en} bn={LIKE_WORDS[k].bn} />
                </button>
              );
            })}
          </div>
          <p className="pbq-label">
            <T en="Leave out any business?" bn="কোনো ব্যবসা বাদ দেবেন?" />
          </p>
          <div className="pbq-chips" role="group" aria-label={bn ? "বাদ দিন" : "Leave out"}>
            {LEAVE_OUT.map((k) => {
              const on = answers.leave_out.includes(k);
              return (
                <button key={k} type="button" className="pbq-chip" aria-pressed={on} onClick={() => toggleLeave(k)}>
                  {on && <IconCheck size={14} />}
                  <T en={LEAVE_WORDS[k].en} bn={LEAVE_WORDS[k].bn} />
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="pbq-foot">
        {/* Phones: Back / Next, and Build on the last step. */}
        <div className="pbq-nav">
          {step > 0 ? (
            <Button variant="quiet" size="lg" onClick={() => setStep(step - 1)}>
              <T en="Back" bn="আগের ধাপ" />
            </Button>
          ) : onCancel ? (
            <Button variant="quiet" size="lg" onClick={onCancel}>
              <T en="Back to my plan" bn="পরিকল্পনায় ফিরুন" />
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button size="lg" onClick={() => (step === 0 && amountBad ? undefined : setStep(step + 1))} disabled={step === 0 && amountBad}>
              <T en="Next" bn="পরের ধাপ" />
            </Button>
          ) : (
            <Button size="lg" onClick={build} disabled={building || amountBad}>
              {building ? <T en="Building…" bn="বানানো হচ্ছে…" /> : <T en="Build my portfolio" bn="আমার পোর্টফোলিও বানান" />}
            </Button>
          )}
        </div>
        {/* From 900px: one button under the three questions. */}
        <div className="pbq-wide">
          {onCancel && (
            <Button variant="quiet" size="lg" onClick={onCancel}>
              <T en="Back to my plan" bn="পরিকল্পনায় ফিরুন" />
            </Button>
          )}
          <Button size="lg" onClick={build} disabled={building || amountBad}>
            {building ? <T en="Building…" bn="বানানো হচ্ছে…" /> : <T en="Build my portfolio" bn="আমার পোর্টফোলিও বানান" />}
          </Button>
        </div>
        <p className="pbq-sub">
          <T
            en="We pick only from companies our analysis rates strong."
            bn="শুধু আমাদের বিশ্লেষণে শক্তিশালী কোম্পানি থেকেই বাছাই করি।"
          />
        </p>
      </div>
    </section>
  );
}
