import type { Metadata } from "next";
import { buildMetadata, pageMetadata } from "@/lib/seo/metadata";
import PageHeader from "@/components/ui/PageHeader";
import ProblemSection from "@/components/ui/ProblemSection";
import HowItWorksSection from "@/components/ui/HowItWorksSection";
import WorkflowSection from "@/components/ui/WorkflowSection";
import IntegrationsSection from "@/components/ui/IntegrationsSection";
import { FAQ } from "@/components/ui/FAQ";
import CTA from "@/components/ui/CTA";

export const metadata: Metadata = buildMetadata(pageMetadata.usecases);

/** UseCase page  communicates problem, solution, workflow, integrations, and FAQs. */
export default function UseCasesPage() {
  return (
    <>
      <PageHeader i18nPrefix="usecaseHeader" headingId="usecase-heading" />
      <ProblemSection />
      <HowItWorksSection />
      <WorkflowSection />
      <IntegrationsSection />
      <FAQ />
      <CTA />
    </>
  );
}
