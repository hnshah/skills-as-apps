import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { discoverSkill } from './discover.js';
import { parseFrontmatter, type Frontmatter } from './frontmatter.js';

export type SkillResource = { kind: 'reference' | 'script' | 'asset'; relativePath: string; absolutePath: string };
export type LoadedSkill = {
  name: string;
  description: string;
  compatibility?: string;
  metadata: Record<string, string>;
  frontmatter: Frontmatter;
  rawFrontmatter: string;
  instructions: string;
  skillDir: string;
  skillFile: string;
  sourceRoot: string;
  resources: SkillResource[];
};

async function listTree(dir: string, prefix: string, kind: SkillResource['kind']): Promise<SkillResource[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [] as any[]);
  const out: SkillResource[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...await listTree(absolutePath, relativePath, kind));
    else if (entry.isFile()) out.push({ kind, relativePath, absolutePath });
  }
  return out;
}

export async function loadSkill(inputPath: string): Promise<LoadedSkill> {
  const discovered = await discoverSkill(inputPath);
  const markdown = await readFile(discovered.skillFile, 'utf8');
  const parsed = parseFrontmatter(markdown);
  const name = parsed.frontmatter.name;
  const description = parsed.frontmatter.description;
  if (typeof name !== 'string' || !name.trim()) throw new Error('SKILL.md frontmatter requires a non-empty name');
  if (typeof description !== 'string' || !description.trim()) throw new Error('SKILL.md frontmatter requires a non-empty description');

  const metadataRaw = parsed.frontmatter.metadata;
  const metadata = metadataRaw && typeof metadataRaw === 'object' && !Array.isArray(metadataRaw)
    ? metadataRaw as Record<string, string>
    : {};

  const resources = [
    ...await listTree(path.join(discovered.skillDir, 'references'), 'references', 'reference'),
    ...await listTree(path.join(discovered.skillDir, 'scripts'), 'scripts', 'script'),
    ...await listTree(path.join(discovered.skillDir, 'assets'), 'assets', 'asset'),
  ].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    name,
    description,
    compatibility: typeof parsed.frontmatter.compatibility === 'string' ? parsed.frontmatter.compatibility : undefined,
    metadata,
    frontmatter: parsed.frontmatter,
    rawFrontmatter: parsed.raw,
    instructions: parsed.body.trim(),
    skillDir: discovered.skillDir,
    skillFile: discovered.skillFile,
    sourceRoot: discovered.sourceRoot,
    resources,
  };
}
