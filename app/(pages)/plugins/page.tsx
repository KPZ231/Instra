import type { Metadata } from "next";
import { buildMetadata, pageMetadata } from "@/lib/seo/metadata";
import PageHeader from "@/components/ui/PageHeader";
import AboutPlugins from "../../../components/ui/AboutPlugins";
import OpenSourcePlugins from "@/components/ui/OpenSourcePlugins";
import CTA from "@/components/ui/CTA";

export const metadata: Metadata = buildMetadata(pageMetadata.plugins);

export default function Plugins() {
  return (
    <>
      <PageHeader i18nPrefix="pluginsHeader" headingId="plugins-heading" />
      <AboutPlugins></AboutPlugins>
      <OpenSourcePlugins></OpenSourcePlugins>
      <CTA></CTA>
    </>
  );
}
