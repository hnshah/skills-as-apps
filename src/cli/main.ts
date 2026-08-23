#!/usr/bin/env node
import { loadSkill } from '../skills/load.js';
import { OllamaAdapter } from '../models/ollama.js';
import { runSkill, type RunEvent } from '../runtime/run.js';
import { many, one, parseArgs } from './args.js';

function usage(): void {
  console.log(`Skills as Apps\n\nTurn portable Agent Skills into local software.\n\nCommands:\n  skills-as-apps inspect <skill-or-repo-path>\n  skills-as-apps run <skill-or-repo-path> --objective <text> --model <ollama-model> [--ollama-url URL] [--allow-read PATH ...]\n\nAliases:\n  saa ...\n`);
  process.exit(1);
}

function logEvent(event: RunEvent): void {
  if (event.type === 'model.call') console.error(`[model] turn ${event.turn} ${event.model}`);
  if (event.type === 'tool.call') console.error(`[tool] ${event.name} ${JSON.stringify(event.arguments)}`);
  if (event.type === 'tool.result') console.error(`[tool] ${event.name} ${event.ok ? 'ok' : 'denied/error'}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command) usage();

  if (args.command === 'inspect') {
    const target = args.positionals[0];
    if (!target) usage();
    const skill = await loadSkill(target);
    console.log(JSON.stringify({
      name: skill.name,
      description: skill.description,
      compatibility: skill.compatibility,
      metadata: skill.metadata,
      skillFile: skill.skillFile,
      resources: skill.resources.map((r) => ({ kind: r.kind, path: r.relativePath })),
      runtime: {
        grantedCapabilities: [],
        note: 'Skills as Apps never grants capabilities implicitly.',
      },
    }, null, 2));
    return;
  }

  if (args.command === 'run') {
    const target = args.positionals[0];
    if (!target) usage();
    const objective = one(args, 'objective') ?? 'Execute this skill on the available authorized local scope and return the result.';
    const modelName = one(args, 'model');
    if (!modelName) throw new Error('--model is required for V0, for example --model qwen3:8b');
    const model = new OllamaAdapter(modelName, one(args, 'ollama-url') ?? 'http://127.0.0.1:11434');
    const result = await runSkill({
      skillPath: target,
      objective,
      model,
      allowRead: many(args, 'allow-read'),
      onEvent: logEvent,
    });
    process.stdout.write(result.output.trimEnd() + '\n');
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(`skills-as-apps: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
