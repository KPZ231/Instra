import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import UploadForm from "@/components/dashboard/plugins/UploadForm";
import UploadPageHeader from "@/components/dashboard/plugins/UploadPageHeader";

export const metadata: Metadata = {
  title: "Submit Plugin  Instra",
  robots: { index: false, follow: false },
};

/**
 * Plugin upload page  server component shell wrapping the client upload form.
 * Requires an authenticated session; redirects to login otherwise.
 */
export default async function PluginUploadPage() {
  await verifySession();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <UploadPageHeader />
        <p
          className="font-sans text-sm mt-2"
          style={{ color: "var(--color-accent-bone)" }}
        >
          Your plugin will be reviewed before being published to the marketplace.
        </p>
      </div>

      {/* Form */}
      <div
        className="rounded-sm border p-6"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <UploadForm />
      </div>
    </div>
  );
}
