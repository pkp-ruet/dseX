"use client";

import { useEffect, useState } from "react";
import { IconClose, IconInfo } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const KEY = (uid: string) => `dsex.pf.simpleNote.${uid}`;

/**
 * A short note the first time a reader opens the simple portfolio page
 * (2026-11-23): how the page reads, in one sentence. Closed with ✕ and
 * remembered on the device; nothing shows before the device is read.
 */
export default function PfFirstNote({ uid }: { uid: string | null }) {
  const { bn } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!uid) return;
    try {
      setShow(!localStorage.getItem(KEY(uid)));
    } catch {
      setShow(false);
    }
  }, [uid]);

  if (!show || !uid) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY(uid), "1");
    } catch {
      /* private mode: it shows again next visit */
    }
  };
  return (
    <div className="pf-first pf-block" role="note">
      <span className="pf-first-icon" aria-hidden="true">
        <IconInfo size={16} />
      </span>
      <p>
        <T
          en="Your page has three parts: what your money is worth, whether everything is okay, and what to do. Tap any share for its full story."
          bn="আপনার পেজে তিনটি অংশ: আপনার টাকার মূল্য, সব ঠিক আছে কি না, আর কী করবেন। যেকোনো শেয়ারে চাপ দিলে তার পুরো চিত্র দেখবেন।"
        />
      </p>
      <button type="button" className="pf-first-x" onClick={close} aria-label={bn ? "বন্ধ করুন" : "Close"}>
        <IconClose size={16} />
      </button>
    </div>
  );
}
