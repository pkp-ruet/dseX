/**
 * The reader survey (2026-11-24, plan https://claude.ai/artifact/AQ5dz94EaTaHcCAXLxuvpZ):
 * nine short screens, every question skippable, the Premium part by plan.
 * Rules and storage live in backend/services/survey.py + survey_service.py;
 * `QUESTION_KEYS`, `SCREENS` and `PICK_MAX` must match `survey.QUESTIONS`
 * (backend/tests/test_survey.py::test_frontend_keys_match checks them).
 */

export type Segment = "free" | "premium" | "ending" | "ended";
export type Bi = { en: string; bn: string };
export type AnswerValue = string | number | string[];
export type Answers = Record<string, AnswerValue>;

export interface SurveyState {
  round: string;
  open: boolean;
  due: boolean;
  why: string;
  segment: Segment;
  ends_on: string | null;
  ended_on: string | null;
  trial?: boolean;
  answers: Answers;
  step: number;
  status: "shown" | "started" | "finished" | null;
  contact: boolean;
  screens: number;
}

export const SCREENS = 9;
export const PICK_MAX = 3;

// One line per question: the test reads these lines.
export const QUESTION_KEYS: Record<string, readonly (string | number)[]> = {
  years: ["not_started", "lt1", "y1_3", "y3_10", "gt10"],
  miss: ["very", "somewhat", "not_really", "hardly"],
  use: ["analysis", "portfolio", "watchlist", "dividends", "buylist", "screener", "compare", "market", "results", "ranking", "learn"],
  problems: ["slow", "late", "words", "crowded", "find", "notify", "signin", "pay", "bangla", "none"],
  thought: ["dont_know", "not_yet", "soon", "too_dear", "enough"],
  worth_for: ["analysis", "portfolio", "buylist", "dividends", "news", "signals", "nothing", "other"],
  worth: ["more", "yes", "unsure", "no"],
  continue: ["yes", "probably", "unsure", "probably_not", "no"],
  next_plan: ["monthly", "quarterly", "yearly"],
  stay: ["price", "longer", "more_help", "unused", "money", "market", "other"],
  ended_why: ["didnt_know", "price", "unused", "no_help", "money", "market", "later", "other"],
  back: ["price", "longer", "more_help", "unused", "money", "market", "other"],
  spend_on: ["none", "group", "app", "adviser", "broker"],
  spend_amount: ["lt200", "a200_500", "a500_1k", "a1k_3k", "gt3k"],
  price_good: [0, 50, 100, 150, 200, 300, 500, 1000],
  price_high: [50, 100, 150, 200, 300, 500, 1000],
};

/** The free-text questions (like_text, problem_text, wish_text) have no keys. */
export const TEXT_MAX = 1000;

/** A choice that clears the others when picked. */
export const EXCLUSIVE: Record<string, string> = { problems: "none", worth_for: "nothing", spend_on: "none" };

const b = (en: string, bn: string): Bi => ({ en, bn });

const STAY: Record<string, Bi> = {
  price: b("A lower price", "দাম কম হলে"),
  longer: b("Less a month on a longer plan", "লম্বা প্ল্যানে মাসে কম খরচ হলে"),
  more_help: b("More help with my own shares", "নিজের শেয়ার নিয়ে আরও সাহায্য পেলে"),
  unused: b("I didn't use it enough", "যথেষ্ট ব্যবহার করিনি"),
  money: b("Money is tight right now", "এখন হাতে টাকা কম"),
  market: b("The market is down, I'm not buying", "বাজার পড়তি, এখন কিনছি না"),
  other: b("Something else", "অন্য কিছু"),
};

export const LABELS: Record<string, Record<string, Bi>> = {
  years: {
    not_started: b("Not started yet", "এখনও শুরু করিনি"),
    lt1: b("Under 1 year", "1 বছরের কম"),
    y1_3: b("1 to 3 years", "1 থেকে 3 বছর"),
    y3_10: b("3 to 10 years", "3 থেকে 10 বছর"),
    gt10: b("More than 10 years", "10 বছরের বেশি"),
  },
  miss: {
    very: b("Very disappointed", "খুব খারাপ লাগবে"),
    somewhat: b("Somewhat disappointed", "কিছুটা খারাপ লাগবে"),
    not_really: b("Not really", "তেমন কিছু মনে হবে না"),
    hardly: b("I hardly use it", "আমি খুব একটা ব্যবহার করি না"),
  },
  use: {
    analysis: b("Stock analysis", "শেয়ারের বিশ্লেষণ"),
    portfolio: b("Portfolio check", "পোর্টফোলিও"),
    watchlist: b("Watchlist and updates", "ওয়াচলিস্ট ও আপডেট"),
    dividends: b("Dividend calendar", "ডিভিডেন্ড ক্যালেন্ডার"),
    buylist: b("Buy List", "কেনার তালিকা"),
    screener: b("Screener", "স্ক্রিনার"),
    compare: b("Compare", "শেয়ার তুলনা"),
    market: b("Market today", "আজকের শেয়ার বাজার"),
    results: b("Results", "আর্থিক ফল"),
    ranking: b("Company ranking", "কোম্পানির র‍্যাঙ্কিং"),
    learn: b("Guides and blog", "গাইড ও ব্লগ"),
  },
  problems: {
    slow: b("Pages load slowly", "পেজ খুলতে দেরি হয়"),
    late: b("Prices or news come late", "দাম বা খবর দেরিতে আসে"),
    words: b("Some words are hard to understand", "কিছু শব্দ বুঝতে কষ্ট হয়"),
    crowded: b("Pages feel crowded", "পেজে অনেক কিছু, গুলিয়ে যায়"),
    find: b("Hard to find what I need", "যা দরকার তা খুঁজে পাই না"),
    notify: b("Notifications don't arrive", "নোটিফিকেশন আসে না"),
    signin: b("Trouble signing in", "সাইন ইন করতে সমস্যা"),
    pay: b("Trouble paying", "পেমেন্টে সমস্যা"),
    bangla: b("The Bangla reads oddly", "বাংলা লেখা অস্বাভাবিক লাগে"),
    none: b("No, it all works", "না, সব ঠিক আছে"),
  },
  thought: {
    dont_know: b("I don't really know what it gives", "প্রিমিয়ামে কী আছে ঠিক জানি না"),
    not_yet: b("I looked, it's not for me yet", "দেখেছি, এখনই দরকার নেই"),
    soon: b("I plan to get it soon", "শিগগিরই নেব ভাবছি"),
    too_dear: b("It costs more than I can spend", "আমার জন্য দামটা বেশি"),
    enough: b("The free part is enough for me", "ফ্রি অংশেই আমার চলে যায়"),
  },
  worth_for: {
    analysis: b("Full analysis of any share", "যেকোনো শেয়ারের পুরো বিশ্লেষণ"),
    portfolio: b("A daily check on my portfolio", "প্রতিদিন আমার পোর্টফোলিওর খোঁজ"),
    buylist: b("The Buy List", "কেনার তালিকা"),
    dividends: b("The full dividend calendar", "পুরো ডিভিডেন্ড ক্যালেন্ডার"),
    news: b("Same-day news on my phone", "একই দিনে ফোনে খবর"),
    signals: b("Clear buy / sell signals", "পরিষ্কার কেনা / বেচার সংকেত"),
    nothing: b("Nothing, free is enough", "কিছু না, ফ্রি-ই যথেষ্ট"),
    other: b("Something else", "অন্য কিছু"),
  },
  worth: {
    more: b("More than worth it", "দামের চেয়েও বেশি পেয়েছি"),
    yes: b("Worth it", "হ্যাঁ, দামের যোগ্য"),
    unsure: b("Not sure yet", "এখনও বুঝতে পারছি না"),
    no: b("Not really", "তেমন না"),
  },
  continue: {
    yes: b("Yes, I'll renew", "হ্যাঁ, রিনিউ করব"),
    probably: b("Probably", "সম্ভবত করব"),
    unsure: b("Not sure yet", "এখনও ঠিক করিনি"),
    probably_not: b("Probably not", "সম্ভবত না"),
    no: b("No", "না"),
  },
  next_plan: {
    monthly: b("1 month", "1 মাস"),
    quarterly: b("3 months", "3 মাস"),
    yearly: b("1 year", "1 বছর"),
  },
  stay: STAY,
  ended_why: {
    didnt_know: b("I didn't know it had ended", "শেষ হয়েছে জানতাম না"),
    price: b("It cost too much", "দাম বেশি"),
    unused: b("I didn't use it enough", "যথেষ্ট ব্যবহার করিনি"),
    no_help: b("It didn't help my decisions", "সিদ্ধান্ত নিতে তেমন কাজে লাগেনি"),
    money: b("Money is tight", "হাতে টাকা কম"),
    market: b("The market is down", "বাজার পড়তি"),
    later: b("I'll come back later", "পরে আবার নেব"),
    other: b("Something else", "অন্য কিছু"),
  },
  back: {
    ...STAY,
    unused: b("Nothing, I didn't use it enough", "কিছু না, যথেষ্ট ব্যবহার করিনি"),
    money: b("When I have more money", "হাতে টাকা এলে"),
    market: b("When the market picks up", "বাজার ভালো হলে"),
  },
  spend_on: {
    none: b("No, nothing", "না, কোথাও না"),
    group: b("A paid Facebook, Telegram or WhatsApp group", "টাকা দিয়ে ফেসবুক, টেলিগ্রাম বা হোয়াটসঅ্যাপ গ্রুপ"),
    app: b("Another app or website", "অন্য কোনো অ্যাপ বা ওয়েবসাইট"),
    adviser: b("A person who advises me", "কোনো পরামর্শদাতা"),
    broker: b("My broker's research", "ব্রোকারের রিসার্চ"),
  },
  spend_amount: {
    lt200: b("Under ৳200", "200 টাকার কম"),
    a200_500: b("৳200 to 500", "200 থেকে 500 টাকা"),
    a500_1k: b("৳500 to 1,000", "500 থেকে 1,000 টাকা"),
    a1k_3k: b("৳1,000 to 3,000", "1,000 থেকে 3,000 টাকা"),
    gt3k: b("More than ৳3,000", "3,000 টাকার বেশি"),
  },
};

/** A price chip's words. */
export function priceLabel(p: number): Bi {
  if (p === 0) return b("I wouldn't pay", "দিতাম না");
  const tk = `৳${p.toLocaleString("en-IN")}`;
  return p >= 1000 ? b(`${tk}+`, `${tk}+`) : b(tk, tk);
}

export const PARTS: { title: Bi; screens: number[] }[] = [
  { title: b("About you", "আপনার সম্পর্কে"), screens: [1] },
  { title: b("Your experience", "আপনার অভিজ্ঞতা"), screens: [2, 3, 4, 5] },
  { title: b("Premium", "প্রিমিয়াম"), screens: [6, 7] },
  { title: b("Price", "দাম"), screens: [8, 9] },
];

export function partOf(screen: number): number {
  return Math.max(0, PARTS.findIndex((p) => p.screens.includes(screen)));
}

/** The questions on each screen, by plan (follow-ups included). */
export function screenQuestions(screen: number, seg: Segment): string[] {
  switch (screen) {
    case 1: return ["years"];
    case 2: return ["miss"];
    case 3: return ["use", "like_text"];
    case 4: return ["problems", "problem_text"];
    case 5: return ["wish_text"];
    case 6: return seg === "free" ? ["thought"] : seg === "ended" ? ["ended_why"] : ["worth"];
    case 7: return seg === "free" ? ["worth_for"] : seg === "ended" ? ["back"] : ["continue", "next_plan", "stay"];
    case 8: return ["spend_on", "spend_amount"];
    case 9: return ["price_good", "price_high"];
    default: return [];
  }
}

/** Does a follow-up question apply, given the other answers? (mirrors survey.tidy) */
export function applies(qid: string, a: Answers): boolean {
  const cont = a.continue as string | undefined;
  if (qid === "next_plan") return cont === "yes" || cont === "probably";
  if (qid === "stay") return cont === "unsure" || cont === "probably_not" || cont === "no";
  if (qid === "spend_amount") return ((a.spend_on as string[] | undefined) ?? []).some((s) => s !== "none");
  if (qid === "price_high") return typeof a.price_good === "number" && a.price_good > 0;
  return true;
}

/** The answers with follow-ups that no longer apply taken out (survey.tidy). */
export function tidy(a: Answers): Answers {
  const out: Answers = { ...a };
  for (const q of ["next_plan", "stay", "spend_amount", "price_high"]) {
    if (!applies(q, out)) delete out[q];
  }
  if (typeof out.price_high === "number" && typeof out.price_good === "number" && out.price_high <= out.price_good) {
    delete out.price_high;
  }
  return out;
}

const WEEKDAY_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const MONTH_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Thu 26 Nov" / "বৃহস্পতিবার, 26 নভেম্বর" from a Dhaka `YYYY-MM-DD`. */
export function dayWords(iso: string | null): Bi {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!m) return b("", "");
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const day = d.getUTCDate();
  return b(
    `${WEEKDAY_EN[d.getUTCDay()]} ${day} ${MONTH_EN[d.getUTCMonth()]}`,
    `${WEEKDAY_BN[d.getUTCDay()]}, ${day} ${MONTH_BN[d.getUTCMonth()]}`,
  );
}

/** The question line, with the reader's own dates where it names one. */
export function questionText(qid: string, st: Pick<SurveyState, "segment" | "ends_on" | "ended_on" | "trial">): Bi {
  const ends = dayWords(st.ends_on);
  const ended = dayWords(st.ended_on);
  switch (qid) {
    case "years": return b("How long have you been buying shares?", "কত দিন ধরে শেয়ার কিনছেন?");
    case "miss": return b("If TopStockBD closed tomorrow, how would you feel?", "কাল থেকে TopStockBD বন্ধ হয়ে গেলে আপনার কেমন লাগবে?");
    case "use": return b("What do you use TopStockBD for most?", "TopStockBD-এ সবচেয়ে বেশি কী দেখেন?");
    case "like_text": return b("What do you like most about it?", "এর মধ্যে সবচেয়ে ভালো লাগে কী?");
    case "problems": return b("Is anything hard or not working for you?", "কোথাও কি সমস্যা হচ্ছে, বা কিছু ঠিকমতো কাজ করছে না?");
    case "problem_text": return b("What happened?", "কী হয়েছিল?");
    case "wish_text": return b("If you could change or add one thing, what would it be?", "একটা জিনিস বদলাতে বা যোগ করতে পারলে, কী করতেন?");
    case "thought": return b("Have you thought about getting Premium?", "প্রিমিয়াম নেওয়ার কথা ভেবেছেন?");
    case "worth_for": return b("What would make Premium worth paying for?", "কী থাকলে প্রিমিয়ামের জন্য টাকা দিতে রাজি হতেন?");
    case "worth": return b("Has Premium been worth what you paid?", "যে টাকা দিয়েছেন, প্রিমিয়াম কি তার যোগ্য মনে হয়েছে?");
    case "continue":
      if (!st.ends_on) return b("When your Premium ends, will you continue?", "প্রিমিয়ামের মেয়াদ শেষ হলে চালিয়ে যাবেন?");
      return st.segment === "ending"
        ? b(`Your Premium ends on ${ends.en}. Will you continue?`, `আপনার প্রিমিয়াম শেষ হবে ${ends.bn}। চালিয়ে যাবেন?`)
        : b(`Your Premium runs till ${ends.en}. When it ends, will you continue?`, `আপনার প্রিমিয়াম চলবে ${ends.bn} পর্যন্ত। শেষ হলে চালিয়ে যাবেন?`);
    case "next_plan": return b("Which plan would suit you next?", "পরের বার কোন প্ল্যানটা আপনার জন্য ভালো?");
    case "stay": return b("What would make you stay?", "কী হলে থেকে যেতেন?");
    case "ended_why":
      if (!st.ended_on) return b("What was the main reason you didn't continue Premium?", "প্রিমিয়াম চালিয়ে না যাওয়ার মূল কারণ কী?");
      return st.trial
        ? b(`Your free Premium month ended on ${ended.en}. What was the main reason you didn't buy it?`, `আপনার ফ্রি প্রিমিয়াম মাস শেষ হয়েছে ${ended.bn}। কেন কেনেননি, মূল কারণ কী?`)
        : b(`Your Premium ended on ${ended.en}. What was the main reason you didn't continue?`, `আপনার প্রিমিয়াম শেষ হয়েছে ${ended.bn}। চালিয়ে না যাওয়ার মূল কারণ কী?`);
    case "back": return b("What would bring you back?", "কী হলে আবার নিতেন?");
    case "spend_on": return b("Do you pay for share tips or research anywhere now?", "শেয়ারের টিপস বা গবেষণার জন্য এখন কোথাও টাকা দেন?");
    case "spend_amount": return b("About how much a month, all together?", "সব মিলিয়ে মাসে মোটামুটি কত?");
    case "price_good": return b("Good value at", "এই দামে ঠিক আছে");
    case "price_high": return b("Too much for me at", "এই দাম হলে আর নেব না");
    default: return b("", "");
  }
}

/** A short line under a question, where one helps. */
export function questionHint(qid: string): Bi | null {
  switch (qid) {
    case "use": case "worth_for": case "stay": case "back": return b(`Pick up to ${PICK_MAX}`, `সর্বোচ্চ ${PICK_MAX}টি বেছে নিন`);
    case "problems": case "spend_on": return b("Tap all that apply", "যতগুলো মেলে, সব বেছে নিন");
    case "wish_text": return b("Optional. You can go on without writing anything.", "ইচ্ছে হলে লিখুন। কিছু না লিখেও এগিয়ে যেতে পারেন।");
    default: return null;
  }
}

/** The heading of a screen with more than one question. */
export function screenTitle(screen: number): Bi | null {
  if (screen === 9) return b("For a service like TopStockBD, what would you pay a month?", "TopStockBD-এর মতো একটা সেবার জন্য মাসে কত টাকা দিতে রাজি?");
  return null;
}

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/** Device facts sent once with the answers, so readers aren't asked. */
export function deviceFacts(): { mobile: boolean; browser: string; standalone: boolean; width: number } {
  if (typeof window === "undefined") return { mobile: false, browser: "", standalone: false, width: 0 };
  const ua = navigator.userAgent;
  const browser = /SamsungBrowser/.test(ua) ? "Samsung"
    : /UCBrowser/.test(ua) ? "UC"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Edg\//.test(ua) ? "Edge"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  let standalone = false;
  try { standalone = window.matchMedia("(display-mode: standalone)").matches; } catch {}
  let coarse = false;
  try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch {}
  return { mobile: coarse || window.innerWidth < 768, browser, standalone, width: Math.round(window.innerWidth) };
}
