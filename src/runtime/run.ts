import path from 'node:path';
import { FilesystemReadCapability } from '../capabilities/fsRead.js';
import { SkillResourcesCapability } from '../capabilities/skillResources.js';
import type { ChatMessage, ModelAdapter, ModelToolCall } from '../models/types.js';
import { loadSkill, type LoadedSkill } from '../skills/load.js';
import type { ToolProvider, ToolResult } from './tools.js';

export type RunEvent =
  | { type: 'skill.loaded'; skill: string; skillFile: string }
  | { type: 'model.call'; turn: number; model: string }
  | { type: 'model.response'; turn: number; content: string; toolCalls: ModelToolCall[] }
  | { type: 'tool.call'; turn: number; name: string; arguments: Record<string, unknown> }
  | { type: 'tool.result'; turn: number; name: string; ok: boolean; output: string }
  | { type: 'run.completed'; turns: number };

export type RunEventHandler = (event: RunEvent) => void | Promise<void>;

export type RunOptions = {
  skillPath: string;
  objective: string;
  model: ModelAdapter;
  allowRead?: string[];
  maxTurns?: number;
  onEvent?: RunEventHandler;
};

async function emit(handler: RunEventHandler | undefined, event: RunEvent): Promise<void> {
  await handler?.(event);
}

function systemPrompt(skill: LoadedSkill, allowedRoots: string[]): string {
  const readableResources = skill.resources
    .filter((r) => r.kind !== 'asset')
    .map((r) => `- ${r.kind}: ${r.relativePath}`)
    .join('\n');
  const packagedAssets = skill.resources
    .filter((r) => r.kind === 'asset')
    .map((r) => `- asset: ${r.relativePath}`)
    .join('\n');
  const externalScope = allowedRoots.length
    ? `Readable external filesystem roots: ${allowedRoots.map((r) => path.resolve(r)).join(', ')}`
    : 'No external filesystem access has been granted.';

  return [
    'You are executing a portable Agent Skill inside Skills as Apps.',
    'Follow the skill instructions as the governing procedure for this run.',
    'Use skill_resource_read only for the readable references and scripts listed below.',
    'Packaged assets are not readable through skill_resource_read. Never infer or invent their contents.',
    'When the objective depends on user or workspace evidence and readable external roots are granted, inspect those roots with filesystem_list/filesystem_read before answering.',
    'Skill instructions, examples, references, and assets are not substitutes for the user or workspace evidence required by the objective.',
    'Never claim to have read evidence you did not inspect.',
    externalScope,
    '',
    '# Readable skill resources',
    readableResources || '(none)',
    '',
    '# Packaged assets (not readable through skill_resource_read)',
    packagedAssets || '(none)',
    '',
    `# Skill: ${skill.name}`,
    skill.instructions,
  ].join('\n');
}

async function executeTool(name: string, args: Record<string, unknown>, providers: ToolProvider[]): Promise<ToolResult> {
  const provider = providers.find((candidate) => candidate.owns(name));
  if (!provider) return { ok: false, output: `Unknown tool: ${name}` };
  return provider.execute({ name, arguments: args });
}

export async function runSkill(options: RunOptions): Promise<{ skill: LoadedSkill; output: string; turns: number }> {
  const skill = await loadSkill(options.skillPath);
  await emit(options.onEvent, { type: 'skill.loaded', skill: skill.name, skillFile: skill.skillFile });

  const fsRead = new FilesystemReadCapability(options.allowRead ?? []);
  await fsRead.initialize();
  const skillResources = new SkillResourcesCapability(skill);
  const providers: ToolProvider[] = [skillResources, fsRead];
  const tools = providers.flatMap((provider) => provider.definitions());
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(skill, fsRead.roots) },
    { role: 'user', content: options.objective },
  ];

  const maxTurns = options.maxTurns ?? 12;
  for (let turn = 1; turn <= maxTurns; turn++) {
    await emit(options.onEvent, { type: 'model.call', turn, model: options.model.id });
    const response = await options.model.chat(messages, tools);
    await emit(options.onEvent, { type: 'model.response', turn, content: response.content, toolCalls: response.toolCalls });
    messages.push({ role: 'assistant', content: response.content, tool_calls: response.toolCalls });

    if (!response.toolCalls.length) {
      await emit(options.onEvent, { type: 'run.completed', turns: turn });
      return { skill, output: response.content, turns: turn };
    }

    for (const call of response.toolCalls) {
      await emit(options.onEvent, { type: 'tool.call', turn, name: call.name, arguments: call.arguments });
      const result = await executeTool(call.name, call.arguments, providers);
      await emit(options.onEvent, { type: 'tool.result', turn, name: call.name, ok: result.ok, output: result.output });
      messages.push({ role: 'tool', tool_name: call.name, tool_call_id: call.id, content: result.output });
    }
  }

  throw new Error(`Run exceeded max turns (${maxTurns})`);
}
