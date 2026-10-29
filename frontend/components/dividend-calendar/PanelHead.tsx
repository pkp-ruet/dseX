import type { ReactNode } from "react";

/** The top of one calendar tab: its title (the tab already names it, so it
 *  reads as a quiet h2) and one line on what the list means. */
export default function PanelHead({ title, lead }: { title: ReactNode; lead: ReactNode }) {
  return (
    <div className="dc-panel-head">
      <h2 className="dc-panel-title">{title}</h2>
      <p className="dc-panel-lead">{lead}</p>
    </div>
  );
}
