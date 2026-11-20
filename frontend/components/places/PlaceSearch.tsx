"use client";

import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { T } from "@/components/i18n/T";
import { IconSearch } from "@/components/ui/icons";

/** A search field on a place page: opens the site search (stocks and pages). */
export default function PlaceSearch() {
  return (
    <button type="button" className="pl-search" onClick={openGlobalSearch}>
      <IconSearch size={20} />
      <T en="Search a company or a page" bn="কোম্পানি বা পেজ খুঁজুন" />
    </button>
  );
}
