import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChevronRight } from "@/components/ui/icons";
import { changePct, changeTone, takaGroup } from "@/lib/formatters";
import { EXAMPLE_TAG, type ExampleShare } from "@/lib/guest-home";

/**
 * Block 3 for a guest (2026-11-25): "Your shares", in the signed-in block's
 * own rows (`.hm-srow2`), filled with the sample portfolio at today's prices
 * and tagged as an example. The foot opens the sample's full check.
 */
export default function GuestShares({ rows }: { rows: ExampleShare[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="hm-shares" data-card="guest-shares" aria-labelledby="guest-shares-h">
      <div className="hm-head">
        <h2 className="hm-head-h" id="guest-shares-h">
          <T en="Your shares" bn="আপনার শেয়ার" />
        </h2>
        <span className="hm-g-ex">
          <T en={EXAMPLE_TAG.en} bn={EXAMPLE_TAG.bn} />
        </span>
      </div>
      <div className="hm-tcard">
        <ul className="hm-slist">
          {rows.map((r) => (
            <li key={r.code}>
              <Link href={`/stock/${encodeURIComponent(r.code)}`} className="hm-srow2">
                <span className="hm-srow2-txt">
                  <span className="hm-srow2-name">{r.name}</span>
                  <span className="hm-srow2-sub">
                    <T en={`${r.code} · You own ${r.qty}`} bn={`${r.code} · আপনার ${r.qty}টি`} />
                  </span>
                </span>
                <span className="hm-srow2-num nums">
                  <span className="hm-srow2-val">{takaGroup(r.value)}</span>
                  <span className={`hm-srow2-chg ${changeTone(r.change)}`}>{changePct(r.change)}</span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/sample-portfolio/diversified" className="hm-dmore hm-ours-all">
          <T en="See the full check on this sample" bn="এই নমুনার পুরো যাচাই দেখুন" />
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
