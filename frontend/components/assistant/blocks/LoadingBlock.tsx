import { PERSONA } from "@/lib/assistant/persona";

/** Three-dot typing indicator (animation defined in globals.css as .disha-typing). */
export default function LoadingBlock() {
  return (
    <div
      className="disha-typing inline-flex items-center gap-1 py-1.5"
      role="status"
      aria-label={`${PERSONA.name} is typing`}
    >
      <span />
      <span />
      <span />
    </div>
  );
}
