"use client";

import { useEffect, useState } from "react";
import { setNote } from "@/lib/watchlist";
import Button from "@/components/ui/Button";

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
              className="px-2 py-1 rounded text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <Button type="button" onClick={onClose} disabled={saving} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || text === initial}
            variant="primary"
            size="sm"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
