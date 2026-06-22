"use client";

import { useTranslation } from "react-i18next";

/** @param fixed - true for pages with a fixed navbar, false for dashboard flow layout */
export default function AnnouncementBar({ fixed = false }: { fixed?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={`${fixed ? "fixed top-0 left-0 right-0 z-[60]" : "shrink-0"} bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-300 text-xs text-center py-1.5 px-4`}
    >
      {t("announcement.wip")}
    </div>
  );
}
