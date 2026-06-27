import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllDocSlugs, getDocContent } from "@/lib/api/docs";
import MarkdownRenderer from "@/components/docs/MarkdownRenderer";

interface DocsPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  return getAllDocSlugs();
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug[slug.length - 1]
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${title}  Instra Docs`,
    description: `Instra documentation: ${title}`,
  };
}

/**
 * Renders an individual documentation page identified by its slug.
 * Reads the corresponding .md file from /docs/ at request time.
 * Returns 404 if the file does not exist.
 */
export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const content = getDocContent(slug);

  if (!content) notFound();

  return <MarkdownRenderer content={content} />;
}
