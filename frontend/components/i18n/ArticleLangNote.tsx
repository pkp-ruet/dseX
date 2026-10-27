import Link from "next/link";

/**
 * One line above an article that exists in only one language. It shows only
 * to readers who chose the OTHER language (CSS on `<html data-lang>`): either
 * a link to the same topic in their language, or a note that this piece is
 * only in English / Bengali. The navbar switch already jumps to the pair; this
 * covers readers who arrive from search or a shared link.
 */
export default function ArticleLangNote({
  articleLang,
  pairHref,
  pairLabel,
  lead,
}: {
  /** The language the article itself is written in. */
  articleLang: "en" | "bn";
  /** The same topic in the other language, when there is one. */
  pairHref?: string;
  /** Link text, in the reader's (other) language. Defaults to "Read it in …". */
  pairLabel?: string;
  /** The sentence before the link, in the reader's language (a hub page says
   *  more than "this topic is also written in …"). */
  lead?: string;
}) {
  const cls = "rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-main";
  const link = "font-semibold text-primary-ink hover:underline";

  if (articleLang === "en") {
    return (
      <p data-l="bn" lang="bn" className={cls}>
        {pairHref ? (
          <>
            {lead ?? "এই বিষয়ে বাংলায় একটি লেখা আছে।"}{" "}
            <Link href={pairHref} className={link}>
              {pairLabel ?? "বাংলায় পড়ুন"} →
            </Link>
          </>
        ) : (
          "এই লেখাটি শুধু ইংরেজিতে আছে।"
        )}
      </p>
    );
  }
  return (
    <p data-l="en" lang="en" className={cls}>
      {pairHref ? (
        <>
          {lead ?? "This topic is also written in English."}{" "}
          <Link href={pairHref} className={link}>
            {pairLabel ?? "Read it in English"} →
          </Link>
        </>
      ) : (
        "This article is only available in Bengali."
      )}
    </p>
  );
}
