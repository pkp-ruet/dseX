import HtmlLang from "@/components/i18n/HtmlLang";

/** Everything under /blog is Bengali — mark the document as such. */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLang lang="bn" />
      {children}
    </>
  );
}
