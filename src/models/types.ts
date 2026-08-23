import type { ToolDefinition } from '../runtime/tools.js';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
  tool_call_id?: string;
  tool_calls?: ModelToolCall[];
};

export type ModelToolCall = { id?: string; name: string; arguments: Record<string, unknown> };
export type ModelResponse = { content: string; toolCalls: ModelToolCall[]; raw?: unknown };

export interface ModelAdapter {
  readonly id: string;
  chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse>;
}
