"use client";

import { useSyncExternalStore } from "react";

/**
 * Which lessons the reader has marked as done, kept on this device only
 * (localStorage `dsex.learn.done`, a list of lesson ids). Every part that shows
 * a tick reads the same store, so marking a lesson done updates the rail, the
 * hub and the continue card at once.
 */
const KEY = "dsex.learn.done";
const EVENT = "dsex:learn-done";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function subscribe(cb: () => void): () => void {
  const onChange = () => {
    cache = null;
    cb();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The ids marked done ([] on the server and the first paint). */
export function useLearnDone(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function setLessonDone(id: string, done: boolean): void {
  const now = new Set(read());
  if (done) now.add(id);
  else now.delete(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...now]));
  } catch {
    /* private window: the tick lasts for this page only */
  }
  cache = [...now];
  window.dispatchEvent(new Event(EVENT));
}
