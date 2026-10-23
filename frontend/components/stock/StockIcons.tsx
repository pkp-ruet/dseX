/**
 * Moved to `components/ui/icons.tsx` (the one icon set). This shim keeps the
 * stock page's old names and its 14px default size; `IconChevron` here points
 * down (the dashboard's points right). New code imports from `@/components/ui/icons`.
 */
import type { ComponentType } from "react";
import * as Icons from "@/components/ui/icons";

type IconProps = { size?: number };
const at14 = (Icon: ComponentType<IconProps>) => {
  const Sized = ({ size = 14 }: IconProps) => <Icon size={size} />;
  return Sized;
};

export const IconAlert = at14(Icons.IconAlert);
export const IconFlame = at14(Icons.IconFlame);
export const IconChartBars = at14(Icons.IconChartBars);
export const IconShare = at14(Icons.IconShare);
export const IconCheckCircle = at14(Icons.IconCheckCircle);
export const IconStar = at14(Icons.IconStar);
export const IconCalendar = at14(Icons.IconCalendar);
export const IconWallet = at14(Icons.IconWallet);
export const IconInfo = at14(Icons.IconInfo);
export const IconTrophy = at14(Icons.IconTrophy);
export const IconChevron = at14(Icons.IconChevronDown);
