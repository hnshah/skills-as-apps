import { appendFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type { RunEvent } from '../runtime/run.js';
import type { LoadedSkill } from '../skills/load.js';

export type RunStatus = 'running' | 'completed' | 'failed';

export type RunRecord = {
  schemaVersion: 1;
  id: string;
  status: RunStatus;
  skill: {
    name: string;
    file: string;
    sourceRoot: string;
    sha256: string;
  };
  model: string;
  objective: string;
  permissions: {
    filesystemRead: string[];
  };
  startedAt: string;
  endedAt?: string;
  turns?: number;
  output?: string;
  error?: string;
};

export type StoredRunEvent = {
  at: string;
  event: RunEvent;
};

async function skillHash(skill: LoadedSkill): Promise<string> {
  const bytes = await readFile(skill.skillFile);
  return createHash('sha256').update(bytes).digest('hex');
}

export class RunStore {
  readonly root: string;

  constructor(root = process.env.SKILLS_AS_APPS_HOME || path.join(os.homedir(), '.skills-as-apps')) {
    this.root = path.resolve(root);
  }

  private runsRoot(): string {
    return path.join(this.root, 'runs');
  }

  private runDir(id: string): string {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error(`Invalid run id: ${id}`);
    return path.join(this.runsRoot(), id);
  }

  private recordPath(id: string): string {
    return path.join(this.runDir(id), 'run.json');
  }

  private eventsPath(id: string): string {
    return path.join(this.runDir(id), 'events.jsonl');
  }

  private async writeRecord(record: RunRecord): Promise<void> {
    const dir = this.runDir(record.id);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const target = this.recordPath(record.id);
    const temp = path.join(dir, '.run.json.tmp');
    await writeFile(temp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    await rename(temp, target);
  }

  async create(input: { skill: LoadedSkill; model: string; objective: string; allowRead: string[] }): Promise<RunRecord> {
    const now = new Date().toISOString();
    const record: RunRecord = {
      schemaVersion: 1,
      id: `${now.replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`,
      status: 'running',
      skill: {
        name: input.skill.name,
        file: input.skill.skillFile,
        sourceRoot: input.skill.sourceRoot,
        sha256: await skillHash(input.skill),
      },
      model: input.model,
      objective: input.objective,
      permissions: { filesystemRead: input.allowRead.map((root) => path.resolve(root)) },
      startedAt: now,
    };
    await this.writeRecord(record);
    await writeFile(this.eventsPath(record.id), '', { mode: 0o600 });
    return record;
  }

  async appendEvent(id: string, event: RunEvent): Promise<void> {
    const entry: StoredRunEvent = { at: new Date().toISOString(), event };
    await appendFile(this.eventsPath(id), JSON.stringify(entry) + '\n', { mode: 0o600 });
  }

  async get(id: string): Promise<RunRecord> {
    const raw = await readFile(this.recordPath(id), 'utf8').catch(() => null);
    if (!raw) throw new Error(`Run not found: ${id}`);
    return JSON.parse(raw) as RunRecord;
  }

  async events(id: string): Promise<StoredRunEvent[]> {
    const raw = await readFile(this.eventsPath(id), 'utf8').catch(() => '');
    return raw.split('\n').filter(Boolean).map((line: string) => JSON.parse(line) as StoredRunEvent);
  }

  async complete(id: string, result: { turns: number; output: string }): Promise<RunRecord> {
    const record = await this.get(id);
    record.status = 'completed';
    record.endedAt = new Date().toISOString();
    record.turns = result.turns;
    record.output = result.output;
    delete record.error;
    await this.writeRecord(record);
    return record;
  }

  async fail(id: string, error: unknown): Promise<RunRecord> {
    const record = await this.get(id);
    record.status = 'failed';
    record.endedAt = new Date().toISOString();
    record.error = error instanceof Error ? error.message : String(error);
    await this.writeRecord(record);
    return record;
  }

  async list(limit = 20): Promise<RunRecord[]> {
    const entries = await readdir(this.runsRoot(), { withFileTypes: true }).catch(() => [] as any[]);
    const records: RunRecord[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const record = await this.get(entry.name).catch(() => null);
      if (record) records.push(record);
    }
    return records
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, Math.max(0, limit));
  }
}
