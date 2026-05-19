"use client";

import { useEffect, useState } from "react";
import { setNote } from "@/lib/watchlist";

interface Props {
  code: string;
  initial: string;
  onClose: () => void;
}

const MAX = 500;

export default function NoteEditor({ code, initial, onClose }: Props) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setText(initial), [initial, code]);

  async function handleSave() {
    setSaving(true);
    await setNote(code, text);
    setSaving(false);
    onClose();
  }

  async function handleClear() {
    setSaving(true);
    await setNote(code, "");
    setSaving(false);
    onClose();
  }

  return (
    <div className="watchlist-note-editor flex flex-col gap-2 p-3 border-t border-[var(--border)] bg-[var(--bg)]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        rows={3}
        placeholder={`Why are you watching ${code}? Your private note.`}
        className="w-full text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] p-2 focus:outline-none focus:border-[var(--primary)] resize-none"
        autoFocus
      />
      <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
        <span>{text.length}/{MAX}</span>
        <div className="flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="px-2 py-1 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-2 py-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || text === initial}
            className="px-3 py-1 rounded bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
