import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardWidgetSlot from "@/components/dashboard/DashboardWidgetSlot";

export const metadata: Metadata = buildMetadata({
  slug: "dashboard",
  title: "Dashboard — Instra",
  description: "Your Instra marketing dashboard. Track reach, engagement, campaigns, and plugins in one place.",
  robots: { index: false, follow: false },
});

/** Dashboard overview page — server component entry point. */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardOverview />
      <DashboardWidgetSlot />
    </div>
  );
}
