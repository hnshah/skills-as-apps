export type FrontmatterValue = string | number | boolean | string[] | Record<string, string>;
export type Frontmatter = Record<string, FrontmatterValue>;

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value: string): FrontmatterValue {
  const v = value.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => unquote(part.trim()));
  }
  return unquote(v);
}

/**
 * Small YAML-frontmatter reader for the Agent Skills fields needed in V0.
 * Supports top-level scalars, inline arrays, indented scalar arrays, and one
 * nested string map such as metadata. The raw frontmatter is preserved so the
 * parser can be swapped later without changing the loader contract.
 */
export function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; body: string; raw: string } {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error('SKILL.md must begin with YAML frontmatter');
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('SKILL.md frontmatter is not terminated with ---');

  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const lines = raw.split('\n');
  const result: Frontmatter = {};
  let nestedKey: string | null = null;
  let nestedMap: Record<string, string> = {};
  let nestedList: string[] = [];
  let nestedKind: 'map' | 'list' | null = null;

  const flushNested = () => {
    if (!nestedKey) return;
    result[nestedKey] = nestedKind === 'list' ? nestedList : nestedMap;
    nestedKey = null;
    nestedMap = {};
    nestedList = [];
    nestedKind = null;
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (indent > 0 && nestedKey) {
      if (trimmed.startsWith('- ')) {
        if (nestedKind && nestedKind !== 'list') throw new Error(`Mixed YAML collection under ${nestedKey}`);
        nestedKind = 'list';
        nestedList.push(unquote(trimmed.slice(2)));
        continue;
      }
      const idx = trimmed.indexOf(':');
      if (idx >= 0) {
        if (nestedKind && nestedKind !== 'map') throw new Error(`Mixed YAML collection under ${nestedKey}`);
        nestedKind = 'map';
        nestedMap[trimmed.slice(0, idx).trim()] = unquote(trimmed.slice(idx + 1).trim());
        continue;
      }
    }

    flushNested();
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!value) nestedKey = key;
    else result[key] = parseScalar(value);
  }

  flushNested();
  return { frontmatter: result, body, raw };
}
