import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LoadedSkill, SkillResource } from '../skills/load.js';
import type { ToolCall, ToolDefinition, ToolProvider, ToolResult } from '../runtime/tools.js';

function portablePath(value: string): string {
  return value.split(path.sep).join('/');
}

export class SkillResourcesCapability implements ToolProvider {
  private readonly readable = new Map<string, SkillResource>();

  constructor(skill: LoadedSkill) {
    for (const resource of skill.resources) {
      if (resource.kind === 'asset') continue;
      this.readable.set(portablePath(resource.relativePath), resource);
    }
  }

  owns(name: string): boolean {
    return name === 'skill_resource_read';
  }

  definitions(): ToolDefinition[] {
    return [{
      type: 'function',
      function: {
        name: 'skill_resource_read',
        description: 'Read a text reference or script that belongs to the currently loaded skill. Use this only for paths listed as skill resources in the system context.',
        parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
      },
    }];
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const requested = portablePath(String(call.arguments.path ?? ''));
    const resource = this.readable.get(requested);
    if (!resource) return { ok: false, output: `Unknown or unreadable skill resource: ${requested}` };
    try {
      return { ok: true, output: await readFile(resource.absolutePath, 'utf8') };
    } catch (error) {
      return { ok: false, output: error instanceof Error ? error.message : String(error) };
    }
  }
}
