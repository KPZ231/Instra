import "server-only";
import fs from "fs";
import path from "path";

export type DocFile = {
  type: "file";
  name: string;
  title: string;
  slug: string[];
};

export type DocFolder = {
  type: "folder";
  name: string;
  title: string;
  children: DocNode[];
};

export type DocNode = DocFile | DocFolder;

const DOCS_ROOT = path.join(process.cwd(), "docs");

/**
 * Converts a kebab-case or date-prefixed filename to a human-readable title.
 * @param raw - filename without extension
 * @returns Formatted display title
 * @example titleFromName("2026-06-08-auth-backend") → "Auth Backend"
 */
function titleFromName(raw: string): string {
  return raw
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Recursively scans a directory and builds a DocNode tree.
 * Only includes .md files; skips empty folders.
 * @param dir - Absolute path to scan
 * @param baseSlug - Accumulated slug segments from parent folders
 */
function buildTree(dir: string, baseSlug: string[] = []): DocNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: DocNode[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const children = buildTree(path.join(dir, entry.name), [
        ...baseSlug,
        entry.name,
      ]);
      if (children.length > 0) {
        nodes.push({
          type: "folder",
          name: entry.name,
          title: titleFromName(entry.name),
          children,
        });
      }
    } else if (entry.name.endsWith(".md")) {
      const nameWithoutExt = entry.name.replace(/\.md$/, "");
      nodes.push({
        type: "file",
        name: nameWithoutExt,
        title: titleFromName(nameWithoutExt),
        slug: [...baseSlug, nameWithoutExt],
      });
    }
  }

  return nodes;
}

/**
 * Returns the full docs navigation tree.
 * Called at render time  always reflects the current state of /docs/.
 */
export function getDocsTree(): DocNode[] {
  return buildTree(DOCS_ROOT);
}

/**
 * Reads the raw markdown content of a doc identified by its slug.
 * Guards against path traversal: rejects dangerous segments and verifies the
 * resolved path stays within DOCS_ROOT before reading.
 * @param slug - Array of path segments, e.g. ["superpowers", "plans", "2026-06-08-auth-backend"]
 * @returns Markdown string, or null if the file does not exist or the path is unsafe
 */
export function getDocContent(slug: string[]): string | null {
  const dangerous = (s: string) =>
    s === ".." || s === "." || s.includes("/") || s.includes("\\") || s.includes("\0");

  if (slug.length === 0 || slug.some(dangerous)) return null;

  const filePath = path.resolve(DOCS_ROOT, ...slug) + ".md";
  const rootReal = fs.realpathSync(DOCS_ROOT);

  if (!filePath.startsWith(rootReal + path.sep)) return null;
  if (!fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Returns the first file node in the tree (depth-first), used for default redirect.
 */
export function getFirstDocSlug(nodes: DocNode[] = getDocsTree()): string[] | null {
  for (const node of nodes) {
    if (node.type === "file") return node.slug;
    const found = getFirstDocSlug(node.children);
    if (found) return found;
  }
  return null;
}

/**
 * Flattens the tree into a list of all doc slugs  used for generateStaticParams.
 */
export function getAllDocSlugs(): { slug: string[] }[] {
  function collect(nodes: DocNode[]): string[][] {
    const slugs: string[][] = [];
    for (const node of nodes) {
      if (node.type === "file") slugs.push(node.slug);
      else slugs.push(...collect(node.children));
    }
    return slugs;
  }
  return collect(getDocsTree()).map((slug) => ({ slug }));
}
