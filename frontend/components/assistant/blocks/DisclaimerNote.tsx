import Link from "next/link";
import { COPY } from "@/lib/assistant/copy";

export default function DisclaimerNote() {
  return (
    <p className="mt-1.5 text-xs leading-snug text-text-muted">
      {COPY.disclaimer}{" "}
      <Link href="/disclaimer" className="text-primary hover:underline">
        See disclaimer
      </Link>
    </p>
  );
}
