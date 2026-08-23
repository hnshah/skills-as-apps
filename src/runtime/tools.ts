export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolCall = { name: string; arguments: Record<string, unknown> };
export type ToolResult = { ok: boolean; output: string };

export interface ToolProvider {
  definitions(): ToolDefinition[];
  owns(name: string): boolean;
  execute(call: ToolCall): Promise<ToolResult>;
}
