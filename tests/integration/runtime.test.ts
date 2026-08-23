import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadSkill } from '../../src/skills/load.js';
import { runSkill } from '../../src/runtime/run.js';
import type { ModelAdapter, ModelResponse, ChatMessage } from '../../src/models/types.js';
import type { ToolDefinition } from '../../src/runtime/tools.js';

class ScriptedModel implements ModelAdapter {
  id = 'mock/local';
  calls = 0;
  constructor(private allowedFile: string, private deniedFile: string) {}
  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse> {
    this.calls++;
    if (this.calls === 1) {
      assert.ok(tools.some((tool) => tool.function.name === 'skill_resource_read'));
      return { content: '', toolCalls: [{ id: '0', name: 'skill_resource_read', arguments: { path: 'references/completion-detection.md' } }] };
    }
    if (this.calls === 2) {
      assert.match(messages.at(-1)?.content ?? '', /Search later evidence before surfacing/);
      return { content: '', toolCalls: [{ id: '1', name: 'filesystem_read', arguments: { path: this.allowedFile } }] };
    }
    if (this.calls === 3) {
      assert.match(messages.at(-1)?.content ?? '', /I will send the deck tomorrow/);
      return { content: '', toolCalls: [{ id: '2', name: 'filesystem_read', arguments: { path: this.deniedFile } }] };
    }
    assert.match(messages.at(-1)?.content ?? '', /Denied filesystem\.read/);
    return { content: '# Open Loops\n\n1. Send the deck.\n\nEvidence: fixture note.', toolCalls: [] };
  }
}

test('Milestones 1-3: portable resources, local model loop, and explicit read scope', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'skills-as-apps-'));
  const repo = path.join(temp, 'open-loops');
  const skillDir = path.join(repo, 'skills', 'open-loops');
  const refs = path.join(skillDir, 'references');
  const allowed = path.join(temp, 'authorized');
  const denied = path.join(temp, 'private');
  await mkdir(refs, { recursive: true });
  await mkdir(allowed, { recursive: true });
  await mkdir(denied, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), `---\nname: open-loops\ndescription: Find unresolved commitments.\nmetadata:\n  version: "0.2.0"\n---\n# Open Loops\nEvidence before inference. Read references/completion-detection.md before judging closure.`);
  await writeFile(path.join(refs, 'completion-detection.md'), 'Search later evidence before surfacing.');
  const allowedFile = path.join(allowed, 'notes.md');
  const deniedFile = path.join(denied, 'secret.md');
  await writeFile(allowedFile, 'I will send the deck tomorrow.');
  await writeFile(deniedFile, 'private data');

  const skill = await loadSkill(repo);
  assert.equal(skill.name, 'open-loops');
  assert.equal(skill.resources[0].relativePath, path.join('references', 'completion-detection.md'));

  const events: any[] = [];
  const result = await runSkill({ skillPath: repo, objective: 'Find my open loops.', model: new ScriptedModel(allowedFile, deniedFile), allowRead: [allowed], onEvent: (e) => events.push(e) });
  assert.match(result.output, /Send the deck/);
  assert.ok(events.some((e) => e.type === 'tool.result' && e.name === 'skill_resource_read' && e.ok === true));
  assert.ok(events.some((e) => e.type === 'tool.result' && e.name === 'filesystem_read' && e.ok === false));
});
