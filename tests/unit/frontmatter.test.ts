import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../../src/skills/frontmatter.js';

test('parses Agent Skill frontmatter used by open-loops', () => {
  const input = `---\nname: open-loops\ndescription: Finds unresolved commitments.\nlicense: MIT\nmetadata:\n  author: hnshah\n  version: "0.2.0"\n---\n# Open Loops\nDo the work.`;
  const parsed = parseFrontmatter(input);
  assert.equal(parsed.frontmatter.name, 'open-loops');
  assert.equal(parsed.frontmatter.description, 'Finds unresolved commitments.');
  assert.deepEqual(parsed.frontmatter.metadata, { author: 'hnshah', version: '0.2.0' });
  assert.match(parsed.body, /# Open Loops/);
});

test('accepts indented arrays for standard optional fields', () => {
  const input = `---\nname: demo\ndescription: Demo skill\nallowed-tools:\n  - Read\n  - Grep\n---\nDo it.`;
  const parsed = parseFrontmatter(input);
  assert.deepEqual(parsed.frontmatter['allowed-tools'], ['Read', 'Grep']);
});
