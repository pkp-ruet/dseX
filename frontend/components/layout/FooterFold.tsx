"use client";

import { useState, type ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { IconChevronDown } from "@/components/ui/icons";

/**
 * One footer group (2026-11-18). Below 768px it is a 48px row that opens in
 * place, so the footer is five rows instead of 23 stacked links; from 768px
 * the row button hides and the group is a plain column with its heading
 * (styles `ft-*` in app/styles/nav.css). The links are always in the HTML.
 */
export default function FooterFold({
  id,
  title,
  className = "",
  children,
}: {
  id: string;
  title: { en: string; bn: string };
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ft-group ${className}`} data-open={open ? "" : undefined}>
      <h3 className="ft-hm">
        <button
          type="button"
          className="ft-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <T en={title.en} bn={title.bn} />
          <IconChevronDown size={18} />
        </button>
      </h3>
      <h3 className="ft-h">
        <T en={title.en} bn={title.bn} />
      </h3>
      <div id={id} className="ft-body">
        {children}
      </div>
    </div>
  );
}
