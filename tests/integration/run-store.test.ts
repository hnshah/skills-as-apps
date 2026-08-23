import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { RunStore } from '../../src/runs/store.js';
import { runSkill } from '../../src/runtime/run.js';
import { loadSkill } from '../../src/skills/load.js';
import type { ChatMessage, ModelAdapter, ModelResponse } from '../../src/models/types.js';
import type { ToolDefinition } from '../../src/runtime/tools.js';

class OneShotModel implements ModelAdapter {
  id = 'mock/one-shot';
  async chat(_messages: ChatMessage[], _tools: ToolDefinition[]): Promise<ModelResponse> {
    return { content: 'done', toolCalls: [] };
  }
}

test('Milestone 4: persists inspectable local run records and events', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'skills-as-apps-store-'));
  const home = path.join(temp, 'home');
  const skillDir = path.join(temp, 'skill');
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: demo\ndescription: Demo skill\n---\nReturn done.');

  const skill = await loadSkill(skillDir);
  const store = new RunStore(home);
  const model = new OneShotModel();
  const record = await store.create({ skill, model: model.id, objective: 'Run it.', allowRead: [] });
  const result = await runSkill({ skillPath: skillDir, objective: 'Run it.', model, onEvent: (event) => store.appendEvent(record.id, event) });
  await store.complete(record.id, result);

  const saved = await store.get(record.id);
  const events = await store.events(record.id);
  assert.equal(saved.status, 'completed');
  assert.equal(saved.output, 'done');
  assert.equal(saved.turns, 1);
  assert.equal(saved.skill.name, 'demo');
  assert.match(saved.skill.sha256, /^[a-f0-9]{64}$/);
  assert.ok(events.some((entry) => entry.event.type === 'model.response'));
  assert.ok(events.some((entry) => entry.event.type === 'run.completed'));
  assert.equal((await store.list(10))[0].id, record.id);
  assert.ok((await stat(path.join(home, 'runs', record.id, 'run.json'))).isFile());
  assert.ok((await stat(path.join(home, 'runs', record.id, 'events.jsonl'))).isFile());
});
