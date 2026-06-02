import StreakBadge from "@/components/home/personalized/StreakBadge";

interface Props {
  name?: string | null;
  dateStr: string;
}

export default function WelcomeHeader({ name, dateStr }: Props) {
  return (
    <header className="pt-6 sm:pt-8 pb-1">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{dateStr}</p>
      <h1 className="mt-1 text-[clamp(1.5rem,5vw,2.1rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
        Welcome back{name ? <>, <span className="text-[var(--primary)]">{name}</span></> : ""} 👋
      </h1>
      <StreakBadge />
    </header>
  );
}
