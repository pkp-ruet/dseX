import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import FeedRow from "@/components/feed/FeedRow";
import { EXAMPLE_TAG, type ExampleRow } from "@/lib/guest-home";

/**
 * Block 2 for a guest: "New on your shares", in the feed's own row
 * (`FeedRow`, the same as Updates and the signed-in home since 2026-11-25),
 * filled with three real things from today on well-known shares and tagged
 * as an example — then what it takes to make the block yours.
 */
export default function GuestOurs({ rows }: { rows: ExampleRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="hm-ours" data-card="guest-ours" aria-labelledby="guest-ours-h">
      <div className="hm-head">
        <h2 className="hm-head-h" id="guest-ours-h">
          <T en="New on your shares" bn="আপনার শেয়ারে নতুন" />
        </h2>
        <span className="hm-g-ex">
          <T en={EXAMPLE_TAG.en} bn={EXAMPLE_TAG.bn} />
        </span>
      </div>
      <div className="hm-tcard">
        <ul className="nt-list hm-feed">
          {rows.map((r) => (
            <FeedRow key={r.key} href={r.href} kind={r.kind} tone={r.tone} code={r.code} when={r.when} title={r.text} />
          ))}
        </ul>
        <div className="hm-g-ours-foot">
          <p>
            <b>
              <T en="This is what we would tell you about your own shares." bn="আপনার নিজের শেয়ার নিয়ে আমরা ঠিক এভাবেই জানাব।" />
            </b>
            <span>
              <T
                en="Add the shares you own, or watch a few. We check them after every close."
                bn="আপনার কেনা শেয়ারগুলো যোগ করুন, বা কয়েকটিতে নজর রাখুন। প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো যাচাই করি।"
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
