interface Props {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/** Shimmering placeholder for loading states. */
export default function Skeleton({ className = "", width, height = 16, rounded = "8px" }: Props) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: rounded, display: "block" }}
      aria-hidden="true"
    />
  );
}
