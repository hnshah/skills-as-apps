import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { OllamaAdapter } from '../../src/models/ollama.js';

declare module 'node:http';

test('Ollama adapter speaks the local /api/chat protocol including tool calls', async () => {
  const server: any = createServer((req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const parsed = JSON.parse(body);
      assert.equal(parsed.model, 'local-test');
      assert.equal(parsed.stream, false);
      assert.equal(parsed.tools[0].function.name, 'filesystem_read');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'filesystem_read', arguments: { path: '/tmp/a' } } }] } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address: any = server.address();
  const adapter = new OllamaAdapter('local-test', `http://127.0.0.1:${address.port}`);
  const response = await adapter.chat([{ role: 'user', content: 'read' }], [{ type: 'function', function: { name: 'filesystem_read', description: 'read', parameters: { type: 'object' } } }]);
  assert.equal(response.toolCalls[0].name, 'filesystem_read');
  server.close();
});
