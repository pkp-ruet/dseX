import Button from "@/components/ui/Button";
import { IconCompare } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { compareHref } from "@/lib/compare";

/** The stock page's shortcut to /compare-stocks with this share already in;
 *  the compare page then offers companies from the same sector. */
export default function CompareButton({ code }: { code: string }) {
  return (
    <Button variant="quiet" size="sm" href={compareHref([code])} title="Compare with other shares">
      <IconCompare size={14} />
      <span>
        <T en="Compare" bn="তুলনা" />
      </span>
    </Button>
  );
}
