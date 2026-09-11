/**
 * Stroked SVG icons for the stock detail page. `currentColor`, no emoji — emoji
 * rendered differently on every phone (the same rule the dashboard follows).
 */
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconAlert = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconFlame = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M12 22c4 0 7-2.8 7-6.8 0-3.3-2.2-5.4-3.6-7.2-.4 1.6-1.3 2.6-2.4 3-.1-3.2-1.5-6-4-8-.3 3-1.6 4.4-3 6-1.5 1.8-3 3.7-3 6.2C3 19.2 8 22 12 22Z" />
  </svg>
);

export const IconChartBars = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M3 3v18h18" />
    <path d="M8 17v-6M13 17V7M18 17v-3" />
  </svg>
);

export const IconShare = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

export const IconCheckCircle = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.3 2.3L15.5 9.5" />
  </svg>
);

export const IconStar = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconCalendar = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconWallet = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M3 11h18M16 15h2" />
    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconInfo = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const IconTrophy = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5a1 1 0 0 0-1 1c0 2 1.5 3.5 4 3.5M16 6h3a1 1 0 0 1 1 1c0 2-1.5 3.5-4 3.5" />
    <path d="M12 13v4M8 21h8M10 17h4" />
  </svg>
);

export const IconChevron = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
