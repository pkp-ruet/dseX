import type { ComponentType } from "react";
import {
  IconActivity,
  IconBell,
  IconBook,
  IconBriefcase,
  IconCap,
  IconClipboardCheck,
  IconCoin,
  IconCompare,
  IconCompass,
  IconFileText,
  IconInfo,
  IconPie,
  IconStar,
  IconTrophy,
  IconTune,
} from "@/components/ui/icons";

/** One icon per page of the map (lib/places.ts) — place pages and the home grid. */
export const PAGE_ICON: Record<string, ComponentType<{ size?: number }>> = {
  today: IconActivity,
  results: IconFileText,
  calendar: IconCoin,
  sectors: IconPie,
  buylist: IconClipboardCheck,
  companies: IconTrophy,
  screener: IconTune,
  compare: IconCompare,
  research: IconBook,
  portfolio: IconBriefcase,
  watchlist: IconStar,
  updates: IconBell,
  foryou: IconCompass,
  guides: IconCap,
  about: IconInfo,
};
