# TopStockBD voice and words

How every sentence on the site is written, in English and in Bengali. Decided
2026-10-27. CLAUDE.md links here; read it before writing or changing copy.

## One language per page

The reader picks English or বাংলা with the switch in the navbar. Everything on
the page follows it: headings, sentences, buttons, chips, table headers,
empty states, toasts. Nothing shows both languages at once. First-time visitors
see Bengali.

Same in both languages: company names, trading codes (GP, BRACBANK), index
names (DSEX, DSES, DS30), prices and numbers. Bengali text uses Western digits
(12%, ৳45.6, 9টি) because Bengali numerals render badly on some phones.

How to write it in code: `components/i18n/T.tsx` — `<T en="…" bn="…" />`, or
`both((lang) => …)` for builders that already take a language. Never write a
second-language line under a heading.

## Tone: the calm advisor

Write like a careful bank officer explaining a customer's account: polite,
measured, plain, and on the reader's side.

1. **Short, complete sentences, one idea each.** No half-sentences glued with
   dashes.
2. **Fact first, then what it means for the reader.** "Profit fell 38% this
   quarter. Waiting until it recovers is the safer choice."
3. **Measured, never pushy or alarmed.** "is the safer choice", "worth a look",
   "worth checking" — not "stay away", "don't miss", "danger".
4. **No idioms, no slang, no hype.** Not "skin in the game", "catalyst",
   "bounce back", "on the line", "chase".
5. **No hard words in brackets.** Use the plain word. If a term is needed (P/E,
   EPS, record date), say what it means once, in a sentence.
6. **Sentence case for every label and heading.** "Too much debt", not "Too
   Much Loan".
7. **Say "we" for TopStockBD and "you" for the reader.** "We rate this company
   Good." "You can still buy before 12 Nov to get the dividend."
8. **Bengali is written for Bengali readers, not translated.** Everyday
   standard Bengali (চলিত ভাষা), the polite আপনি, natural word order. Read it
   aloud; if it sounds like a translation, rewrite it.
9. **The old rules still hold.** No track-record or past-performance claims.
   Never "DSEF". No advice beyond what the Buy/Sell signal itself says.

### Before and after

| Before | After |
|---|---|
| Strong company, but the price is near its one-year high — wait for a better entry. | A strong company, but the price is close to its highest level this year. A lower price would be a better time to buy. |
| কোম্পানি ভালো, কিন্তু দাম এখন বছরের সর্বোচ্চের কাছাকাছি — একটু অপেক্ষা করুন। | কোম্পানিটি ভালো, তবে দাম এখন এ বছরের সর্বোচ্চের কাছাকাছি। দাম কিছুটা কমলে কেনা ভালো হবে। |
| Owners (sponsors) hold 12% — modest skin in the game. | Sponsors and directors own 12% of the shares. This is low, so less of their own money is at stake. |
| উদ্যোক্তারা 12% ধরে আছেন — সামান্য অংশীদারিত্ব। | উদ্যোক্তা-পরিচালকদের হাতে 12% শেয়ার। এটি কম, অর্থাৎ কোম্পানিতে তাঁদের নিজের টাকা কম খাটছে। |
| Strong Capital Cushion — Plenty of its own money behind its lending. | Strong capital. The bank lends with a healthy amount of its own money behind it. |
| A fresh dividend declaration is a near-term catalyst. | The company has just declared a dividend. To receive it, you need to hold the shares before the record date. |

## Word list

One word per idea, the same everywhere. Bengali uses the words investors
already say at the brokerage house.

| English | বাংলা |
|---|---|
| share, stock | শেয়ার |
| share price, price | দাম, শেয়ারের দাম |
| market | বাজার |
| index (DSEX) | সূচক (DSEX) |
| sector | সেক্টর (names: `lib/bn.ts` `sectorBn`) |
| company | কোম্পানি |
| page (stock page, this page) | পেজ (শেয়ারের পেজ, এই পেজ) |
| profit / loss | মুনাফা / লোকসান |
| sales | বিক্রি |
| earnings per share (EPS) | ইপিএস |
| price to earnings (P/E) | পিই |
| net asset value per share (NAV) | এনএভি |
| debt, loans | ঋণ |
| interest | সুদ |
| cash from the business | ব্যবসা থেকে আসা নগদ টাকা |
| the company's own money (equity) | নিজস্ব মূলধন |
| market value (market cap) | বাজার মূলধন |
| traded value, turnover | লেনদেন |
| dividend | ডিভিডেন্ড |
| cash dividend / bonus shares | নগদ ডিভিডেন্ড / বোনাস শেয়ার |
| dividend yield | ডিভিডেন্ড ইল্ড |
| record date | রেকর্ড ডেট |
| last day to buy | শেষ কেনার দিন |
| annual general meeting | এজিএম |
| category (A, B, N, Z) | ক্যাটাগরি (A ক্যাটাগরি) |
| sponsors and directors | উদ্যোক্তা-পরিচালক |
| institutions | প্রতিষ্ঠান |
| quarter, quarterly results | প্রান্তিক, প্রান্তিকের ফল |
| yearly accounts | বার্ষিক হিসাব |
| this year's high / low | এ বছরের সর্বোচ্চ / সর্বনিম্ন দাম |
| fair value | ন্যায্য দাম |
| score | স্কোর |
| grade | গ্রেড |
| Excellent · Good · Average · Weak | চমৎকার · ভালো · মাঝারি · দুর্বল |
| Buy · Strong buy · Buy more · Sell | কেনা যায় · কেনার ভালো সুযোগ · আরও কেনা যায় · বিক্রি করুন |
| watchlist | ওয়াচলিস্ট |
| portfolio | পোর্টফোলিও |
| price alert | প্রাইস অ্যালার্ট |
| screener | স্ক্রিনার |
| Premium | প্রিমিয়াম |

Money is always ৳ (`money()`), dates `6 Sep 2026` in English and
`6 সেপ্টেম্বর 2026` in Bengali (`bnDate`).
