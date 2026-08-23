export type ParsedArgs = { command?: string; positionals: string[]; flags: Map<string, string[]> };

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const [rawKey, inline] = token.slice(2).split('=', 2);
      let value = inline;
      if (value === undefined && i + 1 < rest.length && !rest[i + 1].startsWith('--')) value = rest[++i];
      value ??= 'true';
      flags.set(rawKey, [...(flags.get(rawKey) ?? []), value]);
    } else positionals.push(token);
  }
  return { command, positionals, flags };
}

export function one(args: ParsedArgs, name: string): string | undefined { return args.flags.get(name)?.at(-1); }
export function many(args: ParsedArgs, name: string): string[] { return args.flags.get(name) ?? []; }
