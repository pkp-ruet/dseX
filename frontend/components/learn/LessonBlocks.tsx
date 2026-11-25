import type { Block, L, Lang } from "@/lib/learn/types";
import Rich from "./Rich";

/** One lesson section's blocks, in one language (`lib/learn/types.ts`). */
export default function LessonBlocks({ blocks, lang }: { blocks: Block[]; lang: Lang }) {
  const word = (en: string, bn: string) => (lang === "en" ? en : bn);
  const val = (v: string | L) => (typeof v === "string" ? v : v[lang]);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "p":
            return (
              <p key={i} className="lz-p">
                <Rich text={b.text[lang]} />
              </p>
            );
          case "list":
            return (
              <ul key={i} className="lz-list">
                {b.items.map((x, j) => (
                  <li key={j}>
                    <Rich text={x[lang]} />
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className="lz-steps">
                {b.items.map((s, j) => (
                  <li key={j} className="lz-step">
                    <span className="lz-step-n" aria-hidden="true">
                      {j + 1}
                    </span>
                    <div className="lz-step-body">
                      <span className="lz-step-t">
                        <Rich text={s.title[lang]} />
                      </span>
                      {s.text ? (
                        <span className="lz-step-d">
                          <Rich text={s.text[lang]} />
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "tip":
          case "warn":
            return (
              <aside key={i} className={`lz-call lz-call--${b.kind}`}>
                <p className="lz-call-k">
                  {b.title ? b.title[lang] : b.kind === "tip" ? word("Tip", "টিপ") : word("Watch out", "সাবধান")}
                </p>
                <p className="lz-call-t">
                  <Rich text={b.text[lang]} />
                </p>
              </aside>
            );
          case "example":
            return (
              <figure key={i} className="lz-ex">
                <figcaption className="lz-ex-k">{b.title[lang]}</figcaption>
                <table className="lz-ex-t">
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        <td>{r.label[lang]}</td>
                        <td className="lz-ex-v">{val(r.value)}</td>
                      </tr>
                    ))}
                    {b.total ? (
                      <tr className="lz-ex-total">
                        <td>{b.total.label[lang]}</td>
                        <td className="lz-ex-v">{val(b.total.value)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                {b.note ? <p className="lz-ex-note">{b.note[lang]}</p> : null}
              </figure>
            );
          case "flow":
            return (
              <figure key={i} className="lz-flow">
                <ol className="lz-flow-row">
                  {b.items.map((x, j) => (
                    <li key={j} className="lz-flow-item">
                      <span className="lz-flow-box">{x[lang]}</span>
                      {j < b.items.length - 1 ? (
                        <svg className="lz-flow-arrow" viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {b.caption ? <figcaption className="lz-flow-cap">{b.caption[lang]}</figcaption> : null}
              </figure>
            );
          case "table":
            return (
              <div key={i} className="lz-table-wrap">
                <table className="lz-table">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} scope="col">
                          {h[lang]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) =>
                          k === 0 ? (
                            <th key={k} scope="row">
                              <Rich text={c[lang]} />
                            </th>
                          ) : (
                            <td key={k} data-label={r.length > 2 ? b.head[k]?.[lang] : undefined}>
                              <Rich text={c[lang]} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
