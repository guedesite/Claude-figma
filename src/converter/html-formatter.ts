/**
 * Format HTML string with proper indentation.
 */
export function formatHtml(html: string, indentSize: number = 2): string {
  const lines = html.split("\n");
  const result: string[] = [];
  let indent = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Decrease indent for closing tags
    if (line.startsWith("</") && !line.startsWith("<!--")) {
      indent = Math.max(0, indent - 1);
    }

    result.push(" ".repeat(indent * indentSize) + line);

    // Increase indent for opening tags (not self-closing, not void, not comments)
    if (
      line.startsWith("<") &&
      !line.startsWith("</") &&
      !line.startsWith("<!--") &&
      !line.endsWith("/>") &&
      !isVoidElement(line) &&
      // Don't increase for lines that have both open and close tags
      !hasClosingTag(line)
    ) {
      indent += 1;
    }
  }

  return result.join("\n");
}

function isVoidElement(line: string): boolean {
  const voidTags = [
    "area", "base", "br", "col", "embed", "hr", "img",
    "input", "link", "meta", "param", "source", "track", "wbr",
  ];
  const match = line.match(/^<(\w+)/);
  return match ? voidTags.includes(match[1].toLowerCase()) : false;
}

function hasClosingTag(line: string): boolean {
  const match = line.match(/^<(\w+)/);
  if (!match) return false;
  return line.includes(`</${match[1]}>`);
}

/**
 * Build a <style> block from a class-to-CSS map.
 */
export function buildStyleBlock(
  styleMap: Map<string, Record<string, string>>,
): string {
  if (styleMap.size === 0) return "";

  const rules: string[] = ["<style>"];
  for (const [className, props] of styleMap) {
    const declarations = Object.entries(props)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join("\n");
    rules.push(`.${className} {\n${declarations}\n}`);
  }
  rules.push("</style>");

  return rules.join("\n");
}
