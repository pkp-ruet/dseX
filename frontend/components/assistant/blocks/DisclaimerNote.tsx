import Link from "next/link";
import { COPY } from "@/lib/assistant/copy";

export default function DisclaimerNote() {
  return (
    <p className="mt-1.5 text-[0.68rem] leading-snug text-[var(--text-muted)]">
      {COPY.disclaimer}{" "}
      <Link href="/disclaimer" className="text-[var(--primary)] hover:underline">
        See disclaimer
      </Link>
    </p>
  );
}
