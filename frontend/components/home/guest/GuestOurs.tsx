import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import { IconChevronRight } from "@/components/ui/icons";
import { EXAMPLE_TAG, type ExampleRow } from "@/lib/guest-home";

/**
 * Block 4 for a guest: "On your shares", in the signed-in block's own rows,
 * filled with three real things from today on well-known shares and tagged
 * as an example — then what it takes to make the block yours.
 */
export default function GuestOurs({ rows }: { rows: ExampleRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="hm-ours" data-card="guest-ours" aria-labelledby="guest-ours-h">
      <div className="hm-head">
        <h2 className="hm-head-h" id="guest-ours-h">
          <T en="On your shares" bn="আপনার শেয়ারে" />
        </h2>
        <span className="hm-g-ex">
          <T en={EXAMPLE_TAG.en} bn={EXAMPLE_TAG.bn} />
        </span>
      </div>
      <div className="hm-tcard">
        <ul className="hm-nlist">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="hm-nrow">
                <span className="hm-nrow-txt">
                  <span className="hm-nrow-top">
                    <span className={`hm-kind hm-kind--${r.tone}`}>
                      <T en={r.kind.en} bn={r.kind.bn} />
                    </span>
                    <span className="hm-nrow-day nums">
                      <T en={r.when.en} bn={r.when.bn} />
                    </span>
                  </span>
                  <span className="hm-nrow-co">{r.name}</span>
                  <span className="hm-nrow-text">
                    <T en={r.text.en} bn={r.text.bn} />
                  </span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="hm-g-ours-foot">
          <p>
            <b>
              <T en="This is what we would tell you about your own shares." bn="আপনার নিজের শেয়ার নিয়ে আমরা ঠিক এভাবেই জানাব।" />
            </b>
            <span>
              <T
                en="Add the shares you own, or follow a few. We check them after every close."
                bn="আপনার কেনা শেয়ারগুলো যোগ করুন, বা কয়েকটি অনুসরণ করুন। প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো যাচাই করি।"
              />
            </span>
          </p>
          <Button href="/register" variant="primary">
            <T en="Add your shares" bn="শেয়ার যোগ করুন" />
          </Button>
        </div>
      </div>
    </section>
  );
}
