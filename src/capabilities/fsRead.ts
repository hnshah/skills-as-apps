import { readFile, readdir, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { ToolCall, ToolDefinition, ToolProvider, ToolResult } from '../runtime/tools.js';

async function canonical(p: string): Promise<string> {
  return realpath(path.resolve(p));
}

const NAMES = new Set(['filesystem_list', 'filesystem_read', 'filesystem_stat']);

export class FilesystemReadCapability implements ToolProvider {
  readonly roots: string[];

  constructor(roots: string[]) {
    this.roots = roots.map((p) => path.resolve(p));
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.roots.length; i++) this.roots[i] = await canonical(this.roots[i]);
  }

  owns(name: string): boolean {
    return NAMES.has(name);
  }

  definitions(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'filesystem_list',
          description: 'List files and directories inside a user-approved readable root.',
          parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'filesystem_read',
          description: 'Read a UTF-8 text file inside a user-approved readable root.',
          parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'filesystem_stat',
          description: 'Inspect metadata for a file or directory inside a user-approved readable root.',
          parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
        },
      },
    ];
  }

  private async authorize(requested: string): Promise<string> {
    const candidate = await canonical(requested).catch(() => path.resolve(requested));
    const allowed = this.roots.some((root) => candidate === root || candidate.startsWith(root + path.sep));
    if (!allowed) throw new Error(`Denied filesystem.read outside approved roots: ${requested}`);
    return candidate;
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const requested = String(call.arguments.path ?? '');
    if (!requested) return { ok: false, output: 'Missing path' };
    try {
      const target = await this.authorize(requested);
      if (call.name === 'filesystem_list') {
        const entries = await readdir(target, { withFileTypes: true });
        return { ok: true, output: entries.map((e: any) => `${e.isDirectory() ? 'dir' : 'file'}\t${e.name}`).join('\n') };
      }
      if (call.name === 'filesystem_read') {
        const s = await stat(target);
        if (!s.isFile()) throw new Error('Path is not a file');
        return { ok: true, output: await readFile(target, 'utf8') };
      }
      if (call.name === 'filesystem_stat') {
        const s = await stat(target);
        return { ok: true, output: JSON.stringify({ path: target, type: s.isDirectory() ? 'directory' : 'file', size: s.size, mtime: s.mtime.toISOString() }) };
      }
      return { ok: false, output: `Unknown filesystem tool: ${call.name}` };
    } catch (error) {
      return { ok: false, output: error instanceof Error ? error.message : String(error) };
    }
  }
}
