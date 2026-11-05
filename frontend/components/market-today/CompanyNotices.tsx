"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { dayShort } from "@/components/dividend-calendar/dates";
import MkCard from "@/components/market-analysis/MkCard";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import {
  CHIP_OF,
  CHIP_ORDER,
  CHIP_WORD,
  KIND_WORD,
  type NoticeChip,
  type NoticeCompany,
  type NoticeDigest,
} from "@/lib/market-notices";

/** Rows shown before "Show all" (the "All" view only). */
const FIRST = 8;

function Company({ c, block = false }: { c: NoticeCompany; block?: boolean }) {
  return (
    <span className={block ? "mk-nt-co mk-nt-co--block" : "mk-nt-co"}>
      <Link href={`/stock/${c.code}#news`}>{c.name}</Link>
      <span className="mk-nt-tk">{c.code}</span>
      <PersonalMark code={c.code} />
    </span>
  );
}

function Names({ list, more }: { list: NoticeCompany[]; more: number }) {
  const sepEn = (i: number) => (i === 0 ? "" : i === list.length - 1 && !more ? " and " : ", ");
  const sepBn = (i: number) => (i === 0 ? "" : i === list.length - 1 && !more ? " আর " : ", ");
  return (
    <>
      {list.map((c, i) => (
        <Fragment key={c.code}>
          <T en={sepEn(i)} bn={sepBn(i)} />
          <Company c={c} />
        </Fragment>
      ))}
      {more > 0 ? <T en={` and ${more} more.`} bn={` সহ আরও ${more}টি।`} /> : "."}
    </>
  );
}

/**
 * Block 6 of the market page — what companies told DSE on the latest news
 * day, as plain sentences, the ones that matter most first (`lib/market-notices`).
 * Chips filter by kind; every company links to its own page's news. Funds'
 * daily prices are left out.
 */
export default function CompanyNotices({ digest }: { digest: NoticeDigest }) {
  const { lang } = useLang();
  const [chip, setChip] = useState<NoticeChip | "all">("all");
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () => (chip === "all" ? digest.rows : digest.rows.filter((r) => CHIP_OF[r.kind] === chip)),
    [chip, digest.rows],
  );
  if (!digest.rows.length) return null;
  const chips = CHIP_ORDER.filter((c) => digest.counts[c] > 0);
  const shown = chip === "all" && !open ? rows.slice(0, FIRST) : rows;
  const day = digest.day ? dayShort(digest.day) : null;
  const n = digest.total;

  return (
    <MkCard
      id="mk-notices"
      title={<T en="What companies told DSE" bn="কোম্পানিগুলো ডিএসইকে যা জানিয়েছে" />}
      note={
        <>
          <T
            en={`${n} ${n === 1 ? "notice" : "notices"}${day ? ` posted on ${day.en}` : ""}, the ones that matter most first.`}
            bn={`${day ? `${day.bn} ` : ""}${n}টি বিজ্ঞপ্তি এসেছে, জরুরিগুলো আগে।`}
          />
          {digest.skipped > 0 && (
            <>
              {" "}
              <T en="Funds' daily prices are left out." bn="ফান্ডের দৈনিক দাম বাদ দেওয়া হয়েছে।" />
            </>
          )}
        </>
      }
    >
      {chips.length > 1 && (
        <div className="mk-nt-chips" role="group" aria-label={lang === "bn" ? "বিজ্ঞপ্তি বাছাই" : "Filter notices"}>
          <button type="button" className="mk-nt-chip" aria-pressed={chip === "all"} onClick={() => setChip("all")}>
            <T en="All" bn="সব" /> <span className="mk-nt-n">{n}</span>
          </button>
          {chips.map((c) => (
            <button key={c} type="button" className="mk-nt-chip" aria-pressed={chip === c} onClick={() => setChip(c)}>
              <T en={CHIP_WORD[c].en} bn={CHIP_WORD[c].bn} /> <span className="mk-nt-n">{digest.counts[c]}</span>
            </button>
          ))}
        </div>
      )}

      <ul className="mk-nt-rows">
        {shown.map((r) => (
          <li className="mk-nt-row" key={r.key}>
            <span className={`mk-nt-kind mk-nt-kind--${r.kind}`}>
              <i aria-hidden="true" />
              <T en={KIND_WORD[r.kind].en} bn={KIND_WORD[r.kind].bn} />
            </span>
            <p className="mk-nt-what">
              {r.company && <Company c={r.company} block />}
              <T en={r.text.en} bn={r.text.bn} />
              {r.companies && (
                <>
                  {" "}
                  <Names list={r.companies} more={r.more ?? 0} />
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      {chip === "all" && rows.length > FIRST && (
        <button type="button" className="btn-quiet btn-sm btn-block mk-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <T en="Show fewer" bn="কম দেখান" /> : <T en={`Show all ${rows.length}`} bn={`${rows.length}টিই দেখান`} />}
        </button>
      )}

      <p className="mk-card-foot mk-nt-foot">
        <T
          en="Every notice is also on its company's page, under News."
          bn="প্রতিটি বিজ্ঞপ্তি কোম্পানির পেজে, খবর অংশেও আছে।"
        />
      </p>
    </MkCard>
  );
}
