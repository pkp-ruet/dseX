interface Props {
  children: React.ReactNode;
}

export default function SectionLabel({ children }: Props) {
  return (
    <div className="section-label">
      <span>//</span> {children}
    </div>
  );
}
