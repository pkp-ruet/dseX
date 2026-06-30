"use client";

/**
 * The assistant's engine hook. Owns the transcript + status, drives the
 * suggest-stocks slot flow, adds the typing delay, and persists to
 * sessionStorage so the floating panel and the /assistant page share one
 * conversation per tab.
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Chip, Message, MessageBlock, ParseResult } from "@/lib/assistant/types";
import { EMPTY_SUGGEST, type SuggestState } from "@/lib/assistant/types";
import { parse } from "@/lib/assistant/parser";
import { loadScoreUniverse, uniqueSectors } from "@/lib/assistant/company-index";
import type { CompanyRef } from "@/lib/assistant/types";
import {
  respond,
  greetingBlocks,
  errorBlocks,
} from "@/lib/assistant/responders";
import { briefBlocks } from "@/lib/assistant/responders/brief";
import { runSuggest } from "@/lib/assistant/responders/suggestFlow";
import { isLoggedIn } from "@/lib/auth";
import { loadWatchlist, toggleWatchlist } from "@/lib/watchlist";
import {
  SLOT_ORDER,
  nextSlotIndex,
  applySlot,
  slotQuestion,
  prefillFromEntities,
} from "@/lib/assistant/flows";
import type { RecommendationAnswers } from "@/lib/api";
import { apiMarkAiUsed } from "@/lib/api";
import { COPY } from "@/lib/assistant/copy";

// Bump the version when the greeting/chips change so stale transcripts are dropped.
// localStorage (not sessionStorage) so a returning visitor sees continuity.
const STORAGE_KEY = "disha:chat:v3";
// Per-day flag (dateString) so the personalized brief greets at most once a day.
const BRIEF_SEEN_KEY = "disha:brief:seen";
// Cap the persisted transcript so localStorage doesn't grow without bound.
const MAX_PERSIST = 40;

function todayKey(): string {
  return new Date().toDateString();
}

function briefSeenToday(): boolean {
  try {
    return localStorage.getItem(BRIEF_SEEN_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markBriefSeen(): void {
  try {
    localStorage.setItem(BRIEF_SEEN_KEY, todayKey());
  } catch {
    /* private mode — ignore */
  }
}

type Status = "idle" | "thinking";

interface State {
  messages: Message[];
  status: Status;
  /** Reactive mirror of the suggest flow's active flag — drives the quick-action bar. */
  flowActive: boolean;
}

type Action =
  | { type: "hydrate"; messages: Message[] }
  | { type: "add"; message: Message }
  | { type: "replace"; id: string; blocks: MessageBlock[] }
  | { type: "status"; status: Status }
  | { type: "flow"; active: boolean }
  | { type: "reset"; messages: Message[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
    case "reset":
      return { messages: action.messages, status: "idle", flowActive: false };
    case "add":
      return { ...state, messages: [...state.messages, action.message] };
    case "replace":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, blocks: action.blocks } : m,
        ),
      };
    case "status":
      return { ...state, status: action.status };
    case "flow":
      return { ...state, flowActive: action.active };
    default:
      return state;
  }
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mkMessage(sender: Message["sender"], blocks: MessageBlock[]): Message {
  return { id: uid(), sender, blocks, ts: Date.now() };
}

interface Persisted {
  messages: Message[];
  flow: SuggestState;
}

export interface UseAssistant {
  messages: Message[];
  status: Status;
  flowActive: boolean;
  sendText: (text: string) => void;
  sendChip: (chip: Chip) => void;
  cancelFlow: () => void;
  reset: () => void;
}

export function useAssistant(): UseAssistant {
  const [state, dispatch] = useReducer(reducer, {
    messages: [],
    status: "idle",
    flowActive: false,
  });

  const indexRef = useRef<CompanyRef[] | null>(null);
  const sectorsRef = useRef<string[]>([]);
  const flowRef = useRef<SuggestState>(EMPTY_SUGGEST);
  const reducedMotionRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);
  const didInitRef = useRef(false);

  // --- init: hydrate transcript or greet, prefetch the company index ---
  useEffect(() => {
    mountedRef.current = true;
    if (didInitRef.current) return;
    didInitRef.current = true;

    reducedMotionRef.current =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let hydrated = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Persisted;
        const msgs = (data.messages ?? []).filter(
          (m) => m && Array.isArray(m.blocks) && !m.blocks.some((b) => b.type === "loading"),
        );
        if (msgs.length) {
          dispatch({ type: "hydrate", messages: msgs });
          flowRef.current = data.flow ?? EMPTY_SUGGEST;
          dispatch({ type: "flow", active: flowRef.current.active });
          hydrated = true;
        }
      }
    } catch {
      /* ignore bad storage */
    }

    // Once-a-day personalized brief greets on open; otherwise greet only when
    // there's no saved conversation to continue.
    if (!briefSeenToday()) {
      markBriefSeen();
      botRespond(() => briefBlocks());
    } else if (!hydrated) {
      dispatch({ type: "add", message: mkMessage("bot", greetingBlocks()) });
    }

    // Warm the universe so ticker matching + screens are instant later.
    void ensureIndex();

    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- persist (skip in-flight loading messages) ---
  useEffect(() => {
    if (!didInitRef.current) return;
    const persistable = state.messages
      .filter((m) => !m.blocks.some((b) => b.type === "loading"))
      .slice(-MAX_PERSIST);
    const data: Persisted = { messages: persistable, flow: flowRef.current };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [state.messages]);

  const ensureIndex = useCallback(async (): Promise<CompanyRef[]> => {
    if (indexRef.current) return indexRef.current;
    try {
      const universe = await loadScoreUniverse();
      indexRef.current = universe.map((s) => ({
        trading_code: s.trading_code,
        company_name: s.company_name,
      }));
      sectorsRef.current = uniqueSectors(universe);
    } catch {
      indexRef.current = []; // degrade gracefully — screens/market still work
      sectorsRef.current = [];
    }
    return indexRef.current;
  }, []);

  /** Update flow state: the ref for synchronous reads + a reactive flag for the bar. */
  const setFlow = useCallback((next: SuggestState) => {
    flowRef.current = next;
    dispatch({ type: "flow", active: next.active });
  }, []);

  const addUser = useCallback((text: string) => {
    dispatch({ type: "add", message: mkMessage("user", [{ type: "text", text }]) });
    // Adoption signal — fire-and-forget; no-ops when logged out.
    void apiMarkAiUsed();
  }, []);

  /** Push a "typing" bubble, then swap in the produced blocks after a short delay. */
  const botRespond = useCallback((produce: () => Promise<MessageBlock[]>) => {
    const id = uid();
    dispatch({ type: "add", message: { id, sender: "bot", blocks: [{ type: "loading" }], ts: Date.now() } });
    dispatch({ type: "status", status: "thinking" });

    const delay = reducedMotionRef.current ? 0 : 350 + Math.floor(Math.random() * 350);
    const timer = setTimeout(async () => {
      let blocks: MessageBlock[];
      try {
        blocks = await produce();
        if (!blocks.length) blocks = errorBlocks();
      } catch {
        blocks = errorBlocks();
      }
      if (!mountedRef.current) return;
      dispatch({ type: "replace", id, blocks });
      dispatch({ type: "status", status: "idle" });
    }, delay);
    timersRef.current.push(timer);
  }, []);

  /** suggest_stocks → start the slot flow; everything else → dispatcher. */
  const handleParsed = useCallback(
    async (parsed: ParseResult): Promise<MessageBlock[]> => {
      if (parsed.intent === "suggest_stocks") {
        const prefill: Partial<RecommendationAnswers> = prefillFromEntities(parsed.entities.metric);
        const match = parsed.entities.sectorMatch;
        if (match) {
          const matched = sectorsRef.current.filter((s) => s.toLowerCase().includes(match));
          if (matched.length) prefill.sectors = matched;
        }
        const startIdx = nextSlotIndex(prefill, 0);
        setFlow({ active: true, stepIndex: startIdx, collected: prefill });
        return [
          { type: "text", text: COPY.suggest.intro, bn: COPY.suggest.introBn },
          ...slotQuestion(SLOT_ORDER[startIdx], sectorsRef.current),
        ];
      }
      return respond(parsed);
    },
    [setFlow],
  );

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || state.status === "thinking") return;
      addUser(text);

      // Typed text during the slot flow: a confident new intent abandons the
      // flow; otherwise nudge back to the chips.
      if (flowRef.current.active) {
        botRespond(async () => {
          const idx = await ensureIndex();
          const parsed = parse(text, idx);
          if (parsed.intent !== "fallback" && parsed.confidence >= 0.75) {
            setFlow(EMPTY_SUGGEST);
            return handleParsed(parsed);
          }
          const cur = Math.min(flowRef.current.stepIndex, SLOT_ORDER.length - 1);
          return [
            { type: "text", text: "Tap one of these to continue 👇", bn: "চালিয়ে যেতে নিচের একটাতে চাপ দিন 👇" },
            ...slotQuestion(SLOT_ORDER[cur], sectorsRef.current),
          ];
        });
        return;
      }

      botRespond(async () => {
        const idx = await ensureIndex();
        return handleParsed(parse(text, idx));
      });
    },
    [addUser, botRespond, ensureIndex, handleParsed, setFlow, state.status],
  );

  const onSlotAnswer = useCallback(
    (key: Chip["slot"], label: string) => {
      if (!key) return;
      addUser(label);
      const collected = applySlot(flowRef.current.collected, key.key, key.value);
      const nextIdx = nextSlotIndex(collected, flowRef.current.stepIndex + 1);
      if (nextIdx < SLOT_ORDER.length) {
        setFlow({ active: true, stepIndex: nextIdx, collected });
        botRespond(async () => slotQuestion(SLOT_ORDER[nextIdx], sectorsRef.current));
      } else {
        setFlow(EMPTY_SUGGEST);
        botRespond(async () => {
          await ensureIndex();
          return runSuggest(collected);
        });
      }
    },
    [addUser, botRespond, ensureIndex, setFlow],
  );

  const sendChip = useCallback(
    (chip: Chip) => {
      if (state.status === "thinking") return;
      if (chip.slot) {
        onSlotAnswer(chip.slot, chip.label);
        return;
      }
      if (chip.client) {
        addUser(chip.label);
        const { kind, code } = chip.client;
        botRespond(async () => {
          if (!isLoggedIn()) {
            return [
              {
                type: "text",
                text: COPY.actions.signInToSave,
                bn: COPY.actions.signInToSaveBn,
                link: { href: "/login", label: COPY.brief.signIn },
              },
            ];
          }
          if (kind === "watchlist_toggle") {
            await loadWatchlist(); // ensure current state before toggling
            const nowWatched = await toggleWatchlist(code);
            return nowWatched
              ? [{ type: "text", text: COPY.actions.added(code), bn: COPY.actions.addedBn(code) }]
              : [{ type: "text", text: COPY.actions.removed(code), bn: COPY.actions.removedBn(code) }];
          }
          return [];
        });
        return;
      }
      if (chip.action) {
        addUser(chip.label);
        const { intentId, entities } = chip.action;
        botRespond(async () => {
          await ensureIndex();
          return handleParsed({ intent: intentId, entities: entities ?? {}, confidence: 1, raw: chip.label });
        });
        return;
      }
      if (chip.send) sendText(chip.send);
    },
    [addUser, botRespond, ensureIndex, handleParsed, onSlotAnswer, sendText, state.status],
  );

  const cancelFlow = useCallback(() => {
    if (state.status === "thinking") return;
    setFlow(EMPTY_SUGGEST);
  }, [setFlow, state.status]);

  const reset = useCallback(() => {
    setFlow(EMPTY_SUGGEST);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    dispatch({ type: "reset", messages: [mkMessage("bot", greetingBlocks())] });
  }, [setFlow]);

  return {
    messages: state.messages,
    status: state.status,
    flowActive: state.flowActive,
    sendText,
    sendChip,
    cancelFlow,
    reset,
  };
}
