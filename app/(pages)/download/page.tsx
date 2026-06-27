import type { Metadata } from "next";
import { buildMetadata, pageMetadata } from "@/lib/seo/metadata";
import PageHeader from "@/components/ui/PageHeader";
import DownloadInstra from "@/components/ui/DownloadInstra";
import InstallGuide from "@/components/ui/InstallGuide";
import CTA from "@/components/ui/CTA";

export const metadata: Metadata = buildMetadata(pageMetadata.download);

/** Download page  presents Instra CLI and Desktop Agent with install instructions. */
export default function DownloadPage() {
  return (
    <>
      <PageHeader i18nPrefix="downloadHeader" headingId="download-heading" />
      <DownloadInstra />
      <InstallGuide />
      <CTA />
    </>
  );
}
