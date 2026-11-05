"use client";

import { useState } from "react";
import Chip from "@/components/ui/Chip";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { bdGroup } from "@/lib/formatters";
import {
  dayWords,
  monthWords,
  tkWords,
  type MoneyRow,
  type OwnerGroup,
  type OwnersReport,
  type OwnerTradeRow,
} from "@/lib/research-reports";
import { CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SHOWN = 8;
const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100) / 100)}`;
const abs2 = (v: number | null) => Math.abs(Math.round((v ?? 0) * 100) / 100);

/** The owners report's body (Premium). */
export default function OwnersView({ data }: { data: OwnersReport }) {
  return (
    <PersonalCodesProvider>
      <Inner data={data} />
    </PersonalCodesProvider>
  );
}

function Inner({ data }: { data: OwnersReport }) {
  const mine = useMine();
  const [onlyMine, setOnlyMine] = useState(false);
  const keep = <R extends { code: string }>(rows: R[]) => (onlyMine ? rows.filter((r) => mine.has(r.code)) : rows);
  const month = monthWords(data.month);
  const anyMine =
    mine.size > 0 &&
    [
      ...data.trades.buying, ...data.trades.selling, ...data.institute.in, ...data.institute.out,
      ...data.foreign.in, ...data.foreign.out, ...data.agree.buying, ...data.agree.selling, ...data.under30,
    ].some((r) => mine.has(r.code));

  return (
    <>
      {anyMine && (
        <div className="rr-chips" role="group" aria-label="Filter">
          <Chip active={!onlyMine} onClick={() => setOnlyMine(false)}>
            <T en="Every company" bn="সব কোম্পানি" />
          </Chip>
          <Chip active={onlyMine} onClick={() => setOnlyMine(true)}>
            <T en="Only your shares" bn="শুধু আপনার শেয়ার" />
          </Chip>
        </div>
      )}

      <RrSection
        id="rr-money"
        title={<T en="Big investors this month" bn="এ মাসে বড় বিনিয়োগকারীরা" />}
        lead={
          <T
            en={`From DSE's ownership report for ${month.en}, against the month before. The taka is the share of the company that changed hands, at today's market value.`}
            bn={`${month.bn}-এর ডিএসই মালিকানা প্রতিবেদন থেকে, আগের মাসের সঙ্গে তুলনা করে। টাকার অঙ্ক হলো কোম্পানির যে অংশ হাতবদল হয়েছে, আজকের বাজারমূল্যে।`}
          />
        }
      >
        <div className="rr-two rr-two--tight">
          <MoneyList
            title={{ en: "Institutions bought", bn: "প্রতিষ্ঠান কিনেছে" }}
            rows={keep(data.institute.in)}
            tone="up"
          />
          <MoneyList
            title={{ en: "Institutions sold", bn: "প্রতিষ্ঠান বেচেছে" }}
            rows={keep(data.institute.out)}
            tone="down"
          />
        </div>
        <div className="rr-two rr-two--tight">
          <MoneyList
            title={{ en: "Foreign investors bought", bn: "বিদেশিরা কিনেছেন" }}
            rows={keep(data.foreign.in)}
            tone="up"
            empty={{ en: "No company this month.", bn: "এ মাসে কোনো কোম্পানি নেই।" }}
          />
          <MoneyList
            title={{ en: "Foreign investors sold", bn: "বিদেশিরা বেচেছেন" }}
            rows={keep(data.foreign.out)}
            tone="down"
            empty={{ en: "No company this month.", bn: "এ মাসে কোনো কোম্পানি নেই।" }}
          />
        </div>
      </RrSection>

      <RrSection
        id="rr-trades"
        title={<T en="Owners buying and selling their own shares" bn="মালিকেরা নিজেদের শেয়ার কিনছেন ও বেচছেন" />}
        lead={
          <T
            en="Every completed buy and sale they reported to DSE in the last 12 months, added up per company. Taka at today's price."
            bn="গত 12 মাসে তাঁরা ডিএসইকে জানিয়ে যত কেনাবেচা শেষ করেছেন, কোম্পানি ধরে যোগ করা। টাকা আজকের দামে।"
          />
        }
      >
        <div className="rr-two rr-two--tight">
          <TradeList title={{ en: "Owners bought", bn: "মালিকেরা কিনেছেন" }} rows={keep(data.trades.buying)} tone="up" />
          <TradeList title={{ en: "Owners sold", bn: "মালিকেরা বেচেছেন" }} rows={keep(data.trades.selling)} tone="down" />
        </div>
        {(keep(data.trades.pending).length > 0 || keep(data.trades.lapsed).length > 0) && (
          <div className="rr-two rr-two--tight">
            <DeclList
              title={{ en: "Announced, not done yet", bn: "ঘোষণা দিয়েছেন, এখনো শেষ হয়নি" }}
              rows={keep(data.trades.pending)}
            />
            <DeclList
              title={{ en: "Announced, but not done", bn: "ঘোষণা দিয়েও করেননি" }}
              note={{
                en: "A sale announced and then dropped can mean the owner found no buyer at their price.",
                bn: "ঘোষণা দিয়ে বিক্রি না করা মানে হতে পারে, ওই দামে ক্রেতা পাননি।",
              }}
              rows={keep(data.trades.lapsed)}
            />
          </div>
        )}
      </RrSection>

      <RrSection
        id="rr-agree"
        title={<T en="Everyone buying, or everyone selling" bn="সবাই কিনছে, বা সবাই বেচছে" />}
        lead={
          <T
            en="Over about 3 months, at least two of the three groups (founders, institutions, foreign investors) moved the same way, and none the other way."
            bn="প্রায় 3 মাসে তিনটি দলের (উদ্যোক্তা, প্রতিষ্ঠান, বিদেশি) অন্তত দুটি একই দিকে গেছে, আর কেউ উল্টো দিকে যায়নি।"
          />
        }
      >
        <div className="rr-two rr-two--tight">
          <AgreeList title={{ en: "All buying", bn: "সবাই কিনছে" }} rows={keep(data.agree.buying)} groups={data.groups} />
          <AgreeList title={{ en: "All selling", bn: "সবাই বেচছে" }} rows={keep(data.agree.selling)} groups={data.groups} />
        </div>
      </RrSection>

      <Under30 rows={keep(data.under30)} />
    </>
  );
}

function ListHead({ title, n, tone }: { title: { en: string; bn: string }; n: number; tone?: "up" | "down" }) {
  return (
    <p className="rr-week-k">
      {tone && <span className={`rr-dot ${tone === "up" ? "rr-dot--green" : "rr-dot--red"}`} aria-hidden="true" />}
      <T en={title.en} bn={title.bn} />
      <span className="rr-week-n nums">{n}</span>
    </p>
  );
}

function MoneyList({ title, rows, tone, empty }: {
  title: { en: string; bn: string };
  rows: MoneyRow[];
  tone: "up" | "down";
  empty?: { en: string; bn: string };
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, SHOWN);
  return (
    <div className="rr-card rr-col">
      <ListHead title={title} n={rows.length} tone={tone} />
      {rows.length === 0 ? (
        <p className="rr-fine">
          <T en={empty?.en ?? "None this month."} bn={empty?.bn ?? "এ মাসে নেই।"} />
        </p>
      ) : (
        <ul className="rr-mini">
          {shown.map((r) => {
            const tk = tkWords(r.tk);
            return (
              <li key={r.code}>
                <span className="min-w-0">
                  <CompanyName code={r.code} name={r.name} hash="#ownership" />
                  <span className="rr-mini-sub">
                    <T
                      en={`${r.from_pct}% → ${r.to_pct}% of the company${r.jump ? " · may be a reclassification" : ""}`}
                      bn={`কোম্পানির ${r.from_pct}% → ${r.to_pct}%${r.jump ? " · শ্রেণি বদল হতে পারে" : ""}`}
                    />
                  </span>
                </span>
                <span className={`rr-mini-v nums ${tone === "up" ? "rr-up" : "rr-down"}`}>
                  {pp(r.pp)}
                  <T en=" pts" bn=" পয়েন্ট" />
                  {r.tk ? (
                    <small>
                      <T en={tk.en} bn={tk.bn} />
                    </small>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </div>
  );
}

function TradeList({ title, rows, tone }: { title: { en: string; bn: string }; rows: OwnerTradeRow[]; tone: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, SHOWN);
  return (
    <div className="rr-card rr-col">
      <ListHead title={title} n={rows.length} tone={tone} />
      {rows.length === 0 ? (
        <p className="rr-fine">
          <T en="None in the last 12 months." bn="গত 12 মাসে নেই।" />
        </p>
      ) : (
        <ul className="rr-mini">
          {shown.map((r) => {
            const tk = tkWords(r.net_tk);
            const last = dayWords(r.last);
            const who = r.people[0];
            return (
              <li key={r.code}>
                <span className="min-w-0">
                  <CompanyName code={r.code} name={r.name} hash="#ownership" />
                  <span className="rr-mini-sub">
                    <T
                      en={`${bdGroup(Math.abs(r.net_shares))} shares net · last ${last.en}${who ? ` · ${who.role_en}${who.name ? `: ${who.name}` : ""}` : ""}`}
                      bn={`নিট ${bdGroup(Math.abs(r.net_shares))}টি শেয়ার · সর্বশেষ ${last.bn}${who ? ` · ${who.role_bn}${who.name ? `: ${who.name}` : ""}` : ""}`}
                    />
                  </span>
                </span>
                <span className={`rr-mini-v nums ${tone === "up" ? "rr-up" : "rr-down"}`}>
                  <T en={tk.en || "–"} bn={tk.bn || "–"} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </div>
  );
}

function DeclList({ title, rows, note }: {
  title: { en: string; bn: string };
  rows: OwnersReport["trades"]["pending"];
  note?: { en: string; bn: string };
}) {
  return (
    <div className="rr-card rr-col">
      <ListHead title={title} n={rows.length} />
      {note && (
        <p className="rr-fine">
          <T en={note.en} bn={note.bn} />
        </p>
      )}
      {rows.length === 0 ? (
        <p className="rr-fine">
          <T en="None." bn="নেই।" />
        </p>
      ) : (
        <ul className="rr-mini">
          {rows.map((r) => {
            const d = dayWords(r.declared);
            const tk = tkWords(r.tk);
            return (
              <li key={`${r.code}-${r.declared}-${r.side}`}>
                <span className="min-w-0">
                  <CompanyName code={r.code} name={r.name} hash="#ownership" />
                  <span className="rr-mini-sub">
                    <T
                      en={`${r.role_en} said on ${d.en} they would ${r.side === "buy" ? "buy" : "sell"} ${bdGroup(r.shares ?? 0)} shares`}
                      bn={`${d.bn} তারিখে ${r.role_bn} ${bdGroup(r.shares ?? 0)}টি শেয়ার ${r.side === "buy" ? "কেনার" : "বেচার"} ঘোষণা দিয়েছেন`}
                    />
                  </span>
                </span>
                <span className={`rr-mini-v nums ${r.side === "buy" ? "rr-up" : "rr-down"}`}>
                  <T en={tk.en || "–"} bn={tk.bn || "–"} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AgreeList({ title, rows, groups }: {
  title: { en: string; bn: string };
  rows: OwnersReport["agree"]["buying"];
  groups: Record<OwnerGroup, { en: string; bn: string }>;
}) {
  return (
    <div className="rr-card rr-col">
      <ListHead title={title} n={rows.length} />
      {rows.length === 0 ? (
        <p className="rr-fine">
          <T en="No company right now." bn="এখন কোনো কোম্পানি নেই।" />
        </p>
      ) : (
        <ul className="rr-mini">
          {rows.map((r) => (
            <li key={r.code} className="rr-mini--stack">
              <CompanyName code={r.code} name={r.name} hash="#ownership" />
              <span className="rr-pills">
                {(Object.keys(groups) as OwnerGroup[]).map((g) => {
                  const v = r.pp[g];
                  if (v == null) return null;
                  const cls = v >= 0.5 ? "rr-pill rr-pill--up" : v <= -0.5 ? "rr-pill rr-pill--down" : "rr-pill";
                  return (
                    <span key={g} className={cls}>
                      <T en={`${groups[g].en} ${pp(v)} pts`} bn={`${groups[g].bn} ${pp(v)} পয়েন্ট`} />
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Under30({ rows }: { rows: OwnersReport["under30"] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, SHOWN);
  if (rows.length === 0) return null;
  return (
    <RrSection
      id="rr-under30"
      title={<T en="Owners holding less than 30%" bn="মালিকদের হাতে 30%-এর কম" />}
      lead={
        <T
          en="The rules ask founders and directors to hold at least 30% of a company together. These hold less. Government-owned companies are left out."
          bn="নিয়ম অনুযায়ী উদ্যোক্তা-পরিচালকদের মিলে অন্তত 30% শেয়ার রাখতে হয়। এরা কম রেখেছেন। সরকারি মালিকানার কোম্পানি বাদ।"
        />
      }
    >
      <ul className="rr-card rr-list">
        {shown.map((r) => (
          <li key={r.code} className="rr-co">
            <div className="rr-co-head">
              <CompanyName code={r.code} name={r.name} hash="#ownership" />
              <span className="rr-move nums">{r.pct}%</span>
            </div>
            <CompanyMeta sector={r.sector} tier={r.tier}>
              {r.trend === "up" && (
                <span className="rr-up">
                  <T en={`up ${abs2(r.year_pp)} pts in a year`} bn={`এক বছরে ${abs2(r.year_pp)} পয়েন্ট বেড়েছে`} />
                </span>
              )}
              {r.trend === "down" && (
                <span className="rr-down">
                  <T en={`down ${abs2(r.year_pp)} pts in a year`} bn={`এক বছরে ${abs2(r.year_pp)} পয়েন্ট কমেছে`} />
                </span>
              )}
            </CompanyMeta>
          </li>
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={SHOWN} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
  );
}
