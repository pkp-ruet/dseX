import Link from "next/link";
import { T } from "@/components/i18n/T";
import { COPY } from "@/lib/assistant/copy";

export default function DisclaimerNote() {
  return (
    <p className="mt-1.5 text-xs leading-snug text-text-muted">
      <T en={COPY.disclaimer.text} bn={COPY.disclaimer.bn} />{" "}
      <Link href="/disclaimer" className="text-primary hover:underline">
        <T en={COPY.disclaimer.link} bn={COPY.disclaimer.linkBn} />
      </Link>
    </p>
  );
}
