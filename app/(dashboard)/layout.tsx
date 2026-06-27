import { verifySession } from "@/lib/auth/dal";
import AnnouncementBar from "@/components/ui/AnnouncementBar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Image from "next/image";
import Link from "next/link";
import { PenLine } from "lucide-react";

/**
 * Dashboard shell  server component.
 * Calls verifySession() which redirects to /login when unauthenticated.
 * Renders a single top bar: logo · pill nav · actions, then full-width main content.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession();

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#000000]">
      {/* ── Announcement bar ── */}
      <AnnouncementBar />

      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-4 px-4 py-2 shrink-0 border-b"
        style={{
          background: "var(--color-surface-container-lowest)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href={"/"}
          title="Home"
        >
        {/* Logo */}
        <Image
          className="shrink-0 select-none"
          src={"/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"}
          alt="Logo"
          width={160}
          height={40}
        />
        </Link>
        

        {/* Pill nav  centred, takes all remaining space */}
        <div className="flex flex-1 justify-center min-w-0">
          <DashboardSidebar role={user.role} />
        </div>

        {/* Actions: search · bell · avatar */}
        <DashboardHeader user={user} />
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>

      {/* ── FAB: new post ── */}
      <Link
        href="/dashboard/posts/new"
        aria-label="Create new post"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: "var(--color-primary)",
          color: "var(--color-on-primary)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          ["--tw-outline-color" as string]: "var(--color-primary)",
        }}
      >
        <PenLine size={22} aria-hidden="true" />
      </Link>
    </div>
  );
}
