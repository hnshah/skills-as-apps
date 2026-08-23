import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type DiscoveredSkill = {
  skillDir: string;
  skillFile: string;
  sourceRoot: string;
};

async function existsFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

export async function discoverSkill(inputPath: string): Promise<DiscoveredSkill> {
  const resolved = path.resolve(inputPath);
  const inputStat = await stat(resolved).catch(() => null);
  if (!inputStat) throw new Error(`Path does not exist: ${resolved}`);

  if (inputStat.isFile()) {
    if (path.basename(resolved) !== 'SKILL.md') throw new Error('A skill file must be named SKILL.md');
    return { skillDir: path.dirname(resolved), skillFile: resolved, sourceRoot: path.dirname(resolved) };
  }

  const direct = path.join(resolved, 'SKILL.md');
  if (await existsFile(direct)) return { skillDir: resolved, skillFile: direct, sourceRoot: resolved };

  const skillsDir = path.join(resolved, 'skills');
  const children = await readdir(skillsDir, { withFileTypes: true }).catch(() => [] as any[]);
  const matches: DiscoveredSkill[] = [];
  for (const child of children) {
    if (!child.isDirectory()) continue;
    const skillDir = path.join(skillsDir, child.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (await existsFile(skillFile)) matches.push({ skillDir, skillFile, sourceRoot: resolved });
  }

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Multiple skills found under ${skillsDir}. Point directly at one skill directory.`);
  throw new Error(`No SKILL.md found at ${resolved} or under ${skillsDir}`);
}
