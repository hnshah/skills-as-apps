import type { ToolDefinition } from '../runtime/tools.js';
import type { ChatMessage, ModelAdapter, ModelResponse } from './types.js';

export class OllamaAdapter implements ModelAdapter {
  readonly id: string;
  constructor(private model: string, private baseUrl = 'http://127.0.0.1:11434') {
    this.id = `ollama/${model}`;
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelResponse> {
    const ollamaMessages = messages.map((m) => {
      if (m.role === 'tool') return { role: 'tool', content: m.content, tool_name: m.tool_name };
      const out: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.tool_calls) {
        out.tool_calls = m.tool_calls.map((tc) => ({ function: { name: tc.name, arguments: tc.arguments } }));
      }
      return out;
    });

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: ollamaMessages, tools, stream: false }),
    });
    if (!response.ok) throw new Error(`Ollama request failed: HTTP ${response.status} ${await response.text()}`);
    const data: any = await response.json();
    const message = data.message ?? {};
    const toolCalls = (message.tool_calls ?? []).map((tc: any, index: number) => ({
      id: tc.id ?? `ollama-tool-${index}`,
      name: tc.function?.name,
      arguments: typeof tc.function?.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : (tc.function?.arguments ?? {}),
    })).filter((tc: any) => typeof tc.name === 'string');
    return { content: String(message.content ?? ''), toolCalls, raw: data };
  }
}
