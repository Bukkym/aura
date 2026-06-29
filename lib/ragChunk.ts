// Pure markdown chunker for the Ora knowledge base. Splits a file into one
// chunk per H2 section so retrieval returns a focused, self-contained passage
// (each carries the file's H1 title for context). No I/O here: callers read the
// files and pass the text in, which keeps this unit-testable.

export interface KnowledgeChunk {
  id: string;
  source: string;
  title: string;
  heading: string;
  text: string;
}

/**
 * Split one markdown document into section chunks.
 * - The first `# ` line is the document title, prepended to every chunk's text.
 * - Each `## ` heading starts a new chunk; content before the first `## ` (after
 *   the title) is folded into an "intro" chunk only if it is non-empty.
 */
export function chunkMarkdown(source: string, markdown: string): KnowledgeChunk[] {
  const lines = markdown.split("\n");
  let title = source;
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    if (h1) {
      title = h1[1].trim();
      continue;
    }
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);

  return sections
    .map((s, i) => {
      const body = s.body.join("\n").trim();
      return {
        id: `${source}#${i}`,
        source,
        title,
        heading: s.heading,
        body,
        // Prepend title + heading so an embedded chunk keeps its context.
        text: `${title}: ${s.heading}\n\n${body}`.trim(),
      };
    })
    // Drop sections that have a heading but no body content.
    .filter((c) => c.body.length > 0)
    .map(({ body: _body, ...chunk }) => chunk);
}
