// Advanced shortcode parser with parameter support
// Handles: [name], [name param=val], [name param="val with spaces"], [name]content[/name]

export interface ParsedShortcode {
  name: string;
  params: Record<string, string>;
  innerContent: string;
  fullMatch: string;
}

/**
 * Parse parameter string like: sayi=6 format=kart kategori="my slug"
 */
export function parseParams(paramStr: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!paramStr || !paramStr.trim()) return params;

  // Match: key=value, key="value with spaces", key='value', or key (boolean flag)
  const paramRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s\]]*)))?/g;
  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(paramStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? 'true';
    params[key] = value;
  }

  return params;
}

/**
 * Strip HTML tags from a string (used to clean up editor-mangled shortcode params)
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Pre-process content to fix shortcodes whose parameters were mangled by rich-text editors.
 * E.g. [reklam-kodu domain="<a href="http://x.com">x.com</a>"] → [reklam-kodu domain="x.com"]
 */
function cleanShortcodeParams(content: string): string {
  // Match shortcodes that contain HTML tags inside their brackets
  return content.replace(/\[([a-zA-Z0-9_-]+)\s+([^\]]*<[^>]*>[^\]]*)\]/g, (full, name, paramsPart) => {
    // Strip HTML tags from the parameters portion
    const cleaned = stripHtml(paramsPart);
    return `[${name} ${cleaned}]`;
  });
}

/**
 * Find all shortcodes in content, returns them in order of appearance.
 * Supports:
 *   [name]
 *   [name param1=val1 param2=val2]
 *   [name param=val]inner content[/name]
 */
export function findShortcodes(content: string): ParsedShortcode[] {
  const results: ParsedShortcode[] = [];
  if (!content) return results;

  // Clean up HTML that editors may have injected inside shortcode brackets
  content = cleanShortcodeParams(content);

  // First pass: find self-closing + paired shortcodes
  // Paired: [name params]content[/name]
  const pairedRegex = /\[([a-zA-Z0-9_-]+)((?:\s+[^\]]*?)?)\]([\s\S]*?)\[\/\1\]/g;
  const pairedPositions = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pairedRegex.exec(content)) !== null) {
    results.push({
      name: match[1],
      params: parseParams(match[2]),
      innerContent: match[3],
      fullMatch: match[0],
    });
    pairedPositions.add(`${match.index}-${match.index + match[0].length}`);
  }

  // Second pass: find self-closing shortcodes (not part of a paired one)
  const selfRegex = /\[([a-zA-Z0-9_-]+)((?:\s+[^\]]*?)?)\]/g;
  while ((match = selfRegex.exec(content)) !== null) {
    const pos = `${match.index}-${match.index + match[0].length}`;
    // Skip if this is a closing tag [/name]
    if (content[match.index + 1] === '/') continue;
    // Skip if this position is inside a paired shortcode
    let isInsidePaired = false;
    for (const p of pairedPositions) {
      const [start, end] = p.split('-').map(Number);
      if (match.index >= start && match.index + match[0].length <= end) {
        isInsidePaired = true;
        break;
      }
    }
    if (isInsidePaired) continue;

    // Check this isn't the opening tag of a paired shortcode we already found
    const isPairedOpening = results.some(
      (r) => r.fullMatch.startsWith(match![0]) && r.innerContent !== ''
    );
    if (isPairedOpening) continue;

    results.push({
      name: match[1],
      params: parseParams(match[2]),
      innerContent: '',
      fullMatch: match[0],
    });
  }

  return results;
}

/**
 * Replace a shortcode in content with rendered HTML
 */
export function replaceShortcode(content: string, shortcode: ParsedShortcode, replacement: string): string {
  return content.replace(shortcode.fullMatch, replacement);
}
